import { createCity, applyGrowth, applyEventAction, finalizeRoundWasteFlow, advanceToNextEvent } from '../src/game/engine.js';
import { prepareRoundForCity } from '../src/game/engine.js';
import { getArchetypeProfile } from '../src/game/archetype.js';
import { getEventActionCost } from '../src/game/engine.js';

function playFounding(archetype, actionId) {
  const city = createCity('x', 'Test', archetype);
  applyGrowth(city, 1, archetype);
  const q = prepareRoundForCity(city, 1, null);
  const founding = q[0];
  const action = founding.actions.find((a) => a.id === actionId);
  applyEventAction(city, action, 1, {}, founding);
  for (let i = 1; i < q.length; i++) {
    advanceToNextEvent(city);
    const ev = q[i];
    const cheap = ev.actions.find((a) => (a.cost ?? 99) <= city.budget) || ev.actions[0];
    applyEventAction(city, cheap, 1, {}, ev);
    advanceToNextEvent(city);
  }
  finalizeRoundWasteFlow(city, 1, {});
  return city;
}

const hi = playFounding('highIncome', 'c');
const lo = playFounding('lowIncome', 'c');

console.log('=== Archetype compare (year 1, recycle founding) ===');
console.log('High budget:', hi.budget, 'WMS:', hi.wms, 'uncollected%:', ((hi.lastWasteFlow?.uncollected / hi.lastWasteFlow?.generated) * 100).toFixed(0));
console.log('Low  budget:', lo.budget, 'WMS:', lo.wms, 'uncollected%:', ((lo.lastWasteFlow?.uncollected / lo.lastWasteFlow?.generated) * 100).toFixed(0));
console.log('High incinerate cost:', getEventActionCost({ cost: 14, hierarchyTier: 'incinerate' }, {}, 'highIncome'));
console.log('Low  incinerate cost:', getEventActionCost({ cost: 14, hierarchyTier: 'incinerate' }, {}, 'lowIncome'));
console.log('Profiles:', getArchetypeProfile('highIncome').startingBudget, 'vs', getArchetypeProfile('lowIncome').startingBudget);
