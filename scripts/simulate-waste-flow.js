import {
  createCity,
  applyGrowth,
  applyEventAction,
  finalizeRoundWasteFlow,
  advanceToNextEvent,
} from '../src/game/engine.js';
import { prepareRoundForCity } from '../src/game/engine.js';
import { getEventById } from '../src/game/eventEngine.js';

function playRound(city, round, picks) {
  applyGrowth(city, round, city.archetype);
  const queue = prepareRoundForCity(city, round, null);
  city.growthAppliedThisRound = true;
  for (const { eventId, actionId } of picks) {
    const event = queue.find((e) => e.id === eventId) || getEventById(eventId);
    const action = event.actions.find((a) => a.id === actionId);
    applyEventAction(city, action, round, {}, event);
    advanceToNextEvent(city);
  }
  finalizeRoundWasteFlow(city, round, {});
  return city.lastWasteFlow;
}

const hi = createCity('t', 'Test', 'highIncome');
let flow = playRound(hi, 1, [
  { eventId: 'r1_founding', actionId: 'd' },
  { eventId: 'r1_packaging_boom', actionId: 'a' },
  { eventId: 'r1_fast_fashion', actionId: 'a' },
  { eventId: 'r1_food_delivery', actionId: 'a' },
]);
console.log('Reduce-first WMS:', hi.wms, 'D:', flow.D?.toFixed(2));

const burn = createCity('t2', 'Burn', 'highIncome');
applyGrowth(burn, 1, 'highIncome');
const q = prepareRoundForCity(burn, 1, null);
for (const ev of q) {
  const burnAction = ev.actions.find((a) => a.hierarchyTier === 'incinerate') || ev.actions[0];
  applyEventAction(burn, burnAction, 1, {}, ev);
  advanceToNextEvent(burn);
}
finalizeRoundWasteFlow(burn, 1, {});
console.log('Burn-heavy WMS:', burn.wms);

const dump = createCity('t3', 'Dump', 'lowIncome');
applyGrowth(dump, 1, 'lowIncome');
const q2 = prepareRoundForCity(dump, 1, null);
for (const ev of q2) {
  const d = ev.actions.find((a) => a.hierarchyTier === 'dump') || ev.actions[ev.actions.length - 1];
  applyEventAction(dump, d, 1, {}, ev);
  advanceToNextEvent(dump);
}
finalizeRoundWasteFlow(dump, 1, {});
console.log('Dump-heavy WMS:', dump.wms);

console.log('OK — waste flow simulation ran');
