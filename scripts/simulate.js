/**
 * 6-round balance simulation — verifies Fixes 1–3.
 * Run: node scripts/simulate.js
 */
import {
  createCity,
  applyGrowth,
  applyStrategyCard,
  applyWorldEvent,
  processDelayedEffects,
  applyStatusQuoDecay,
  calculateFinalScore,
  rankCities,
  marketModifiersFromEvent,
  gameConfig,
} from '../src/game/engine.js';

const STRATEGIES = {
  'max-recycle': [
    ['source-separation'],
    ['source-separation', 'green-exchange'],
    ['source-separation', 'repair-hubs'],
    ['packaging-tax', 'source-separation'],
    ['integrate-informal', 'green-exchange'],
    ['source-separation', 'polluter-pays'],
  ],
  'cheap-dump': [
    ['open-dump'],
    ['open-dump'],
    ['open-dump', 'expand-collection'],
    ['open-dump'],
    ['open-dump'],
    ['engineered-landfill'],
  ],
  'all-incinerate': [
    ['build-incinerator'],
    ['waste-to-energy'],
    ['build-incinerator'],
    ['waste-to-energy'],
    ['build-incinerator'],
    ['waste-to-energy'],
  ],
  'do-nothing': [
    ['do-nothing'],
    ['do-nothing'],
    ['do-nothing'],
    ['do-nothing'],
    ['do-nothing'],
    ['do-nothing'],
  ],
  balanced: [
    ['awareness-campaign', 'expand-collection'],
    ['engineered-landfill', 'green-exchange'],
    ['integrate-informal', 'repair-hubs'],
    ['awareness-campaign', 'deposit-return'],
    ['integrate-informal', 'green-exchange'],
    ['green-exchange', 'source-separation'],
  ],
};

function simulateGame(archetype, strategyName, worldEvent, eventRound = 3) {
  const city = createCity('sim', strategyName, archetype);
  const cards = STRATEGIES[strategyName];
  let marketModifiers = {};

  for (let round = 1; round <= 6; round++) {
    applyGrowth(city, round, archetype);

    if (round === eventRound && worldEvent) {
      marketModifiers = marketModifiersFromEvent(worldEvent);
      applyWorldEvent(city, worldEvent, round);
    }

    const cardIds = cards[round - 1];
    let played = false;
    for (const cardId of cardIds) {
      const result = applyStrategyCard(city, cardId, round, marketModifiers);
      if (result.success) played = true;
    }
    if (!played) applyStatusQuoDecay(city);
    processDelayedEffects(city);
    calculateFinalScore(city);
  }

  return { strategy: strategyName, archetype, score: city.score, pillars: { ...city.pillars } };
}

function runScenario(archetype, worldEvent, eventRound) {
  const results = Object.keys(STRATEGIES).map((name) =>
    simulateGame(archetype, name, worldEvent, eventRound)
  );
  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => {
    r.rank = i + 1;
  });
  return results;
}

console.log('=== Circular City Balance Simulation ===\n');

const events = gameConfig.worldEvents;
const archetypes = ['highIncome', 'lowIncome'];
const winCounts = {};
const doNothingRanks = [];

for (const archetype of archetypes) {
  console.log(`\n--- ${archetype} ---`);
  for (const event of events) {
    for (let trial = 0; trial < 3; trial++) {
      const eventRound = 2 + (trial % 4);
      const results = runScenario(archetype, event, eventRound);
      const winner = results[0].strategy;
      winCounts[winner] = (winCounts[winner] || 0) + 1;

      const doNothing = results.find((r) => r.strategy === 'do-nothing');
      doNothingRanks.push(doNothing.rank);

      if (trial === 0) {
        console.log(`\n  Event: ${event.name} (round ${eventRound})`);
        for (const r of results) {
          console.log(`    #${r.rank} ${r.strategy.padEnd(16)} score=${r.score}`);
        }
      }
    }
  }
}

console.log('\n=== Summary ===');
console.log('Win counts (higher spread = less dominant strategy):');
for (const [s, c] of Object.entries(winCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${s}: ${c} wins`);
}

const avgDoNothingRank = doNothingRanks.reduce((a, b) => a + b, 0) / doNothingRanks.length;
console.log(`\nDo-nothing average rank: ${avgDoNothingRank.toFixed(2)} (target: ~4–5, near last)`);

console.log('\nMarket crash vs carbon tax (highIncome, round 3):');
const crash = runScenario('highIncome', events.find((e) => e.id === 'market-crash'), 3);
const tax = runScenario('highIncome', events.find((e) => e.id === 'carbon-tax'), 3);
console.log('  Market crash winner:', crash[0].strategy, `(recycle rank: #${crash.find((r) => r.strategy === 'max-recycle').rank})`);
console.log('  Carbon tax winner:', tax[0].strategy, `(dump rank: #${tax.find((r) => r.strategy === 'cheap-dump').rank})`);

const sameWinner = crash[0].strategy === tax[0].strategy;
console.log(`  Different winners: ${!sameWinner ? 'YES ✓' : 'NO ✗'}`);

const doNothingLast = avgDoNothingRank >= 3.5;
const noDominant = Math.max(...Object.values(winCounts)) < 20;
console.log(`\n(a) No single strategy dominates: ${noDominant ? 'PASS ✓' : 'CHECK — may need tuning'}`);
console.log(`(b) Do-nothing near last: ${doNothingLast ? 'PASS ✓' : 'FAIL ✗'}`);
console.log(`(c) Events produce different rankings: ${!sameWinner ? 'PASS ✓' : 'FAIL ✗'}`);
