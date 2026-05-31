/**
 * Event-system verification — run: node scripts/simulate-events.js
 */
import {
  createCity,
  applyGrowth,
  applyEventAction,
  applyWorldEventFlatAndConditionals,
  prepareRoundForCity,
  advanceToNextEvent,
  resolveEventJustify,
  calculateFinalScore,
  rankCities,
  processDelayedEffects,
} from '../src/game/engine.js';
import { worldEvents } from '../src/game/eventEngine.js';
import { cityHasFlag } from '../src/game/eventEngine.js';

function playRound(city, round, worldEvent) {
  applyGrowth(city, round, city.archetype);
  const queue = prepareRoundForCity(city, round, worldEvent);

  for (const event of queue) {
    const action = event.actions[0];
    if (event.eventType === 'world') {
      applyWorldEventFlatAndConditionals(city, event, round);
    }
    applyEventAction(city, action, round, {});
    resolveEventJustify(city, event, event.justify?.correctIndex ?? 0);
    advanceToNextEvent(city);
  }
}

function simulatePath(name, archetype, foundingActionId, preferDump = false) {
  const city = createCity('sim', name, archetype);
  for (let round = 1; round <= 6; round++) {
    const world = round >= 2 ? worldEvents.find((w) => w.id === 'w4-landfill-fire') : null;
    applyGrowth(city, round, archetype);
    const queue = prepareRoundForCity(city, round, world);
    for (const event of queue) {
      let action;
      if (event.id === 'r1_founding') {
        action = event.actions.find((a) => a.id === foundingActionId) || event.actions[0];
      } else if (preferDump && event.actions.some((a) => a.hierarchyTier === 'dump')) {
        action = event.actions.find((a) => a.hierarchyTier === 'dump');
      } else {
        action = event.actions[0];
      }
      if (event.eventType === 'world') applyWorldEventFlatAndConditionals(city, event, round);
      applyEventAction(city, action, round, {});
      resolveEventJustify(city, event, event.justify?.correctIndex ?? 0);
      advanceToNextEvent(city);
    }
    processDelayedEffects(city);
  }
  calculateFinalScore(city);
  return city;
}

let pass = 0;
let fail = 0;

function check(label, cond) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
  }
}

console.log('=== Event System Simulation ===\n');

const linear = simulatePath('linear', 'lowIncome', 'a', true);
check('Founding A sets PRIMARY_DISPOSE', cityHasFlag(linear, 'PRIMARY_DISPOSE'));
check('Dump path sets DUMP_RELIANT by round 6', cityHasFlag(linear, 'DUMP_RELIANT'));

const circular = simulatePath('circular', 'highIncome', 'c', false);
check('Founding C sets PRIMARY_RECYCLE', cityHasFlag(circular, 'PRIMARY_RECYCLE'));
check('Founding C sets CIRCULAR_PATH', cityHasFlag(circular, 'CIRCULAR_PATH'));

const queues = new Set();
for (let i = 0; i < 10; i++) {
  const c = createCity('x', 'test', 'highIncome');
  const q = prepareRoundForCity(c, 2, null);
  queues.add(q.map((e) => e.id).join(','));
}
check('Round 2 selection varies between runs', queues.size > 1);

const dumpCity = createCity('d', 'd', 'lowIncome');
playRound(dumpCity, 1, null);
const founding = dumpCity.flags.filter((f) => f.startsWith('PRIMARY_'));
check('Exactly one PRIMARY flag after founding', founding.length === 1);

const ranked = rankCities([linear, circular]);
check('Scores rank differently', ranked[0].score !== ranked[1].score || ranked[0].id !== ranked[1].id);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);
