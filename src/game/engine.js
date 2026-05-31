import gameConfig from './gameConfig.json' with { type: 'json' };
import {
  setCityFlags,
  clearCityFlags,
  checkTransitionRules,
  applyWorldEventConditionals,
  worldEventMarketModifiers,
  buildRoundEventQueue,
  getCurrentEvent,
  pickWorldEvent,
  foundingEvent,
} from './eventEngine.js';

const PILLAR_KEYS = ['environment', 'economy', 'liveability', 'capacity', 'circularity'];

export function createCity(id, studentName, archetype) {
  const curve = gameConfig.growthCurves[archetype];
  return {
    id,
    studentName,
    archetype,
    pillars: { ...curve.startingPillars },
    population: archetype === 'highIncome' ? 500000 : 800000,
    affluence: archetype === 'highIncome' ? 1.8 : 0.6,
    debt: 0,
    participationRate: gameConfig.participation.baseRate,
    insightPoints: 0,
    budget: gameConfig.startingBudget,
    wasteLoad: 0,
    footprint: 0,
    decisionLog: [],
    builtAssets: [],
    delayedEffects: [],
    score: 0,
    balanceScore: 0,
    rank: null,
    quizStreak: 0,
    totalDecisionTime: 0,
    decisionsCount: 0,
    crisisTriggered: false,
    flags: [],
    circularActionCount: 0,
    dumpActionCount: 0,
    lastRoundEventIds: [],
    currentRoundEvents: [],
    currentEventIndex: 0,
    roundEventsResolved: 0,
    roundComplete: false,
    growthAppliedThisRound: false,
    roundResolutions: [],
  };
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function applyGrowth(city, round, archetype) {
  const curve = gameConfig.growthCurves[archetype];
  const popGrowth = curve.populationGrowth[round - 1] ?? 1.03;
  const affGrowth = curve.affluenceGrowth[round - 1] ?? 1.03;

  city.population = Math.round(city.population * popGrowth);
  city.affluence = city.affluence * affGrowth;

  const wasteFactor = Math.pow(city.population / 500000, 1.15);
  city.wasteLoad = Math.round(
    curve.wastePerCapita * city.affluence * wasteFactor * (round * 0.8 + 0.4)
  );
  city.footprint = Math.round(city.wasteLoad * 1.4 * city.affluence);

  const capacityDrain = Math.round(city.wasteLoad / 120);
  city.pillars.capacity = clamp(city.pillars.capacity - capacityDrain);

  const envDrain = Math.round(city.wasteLoad / 200);
  city.pillars.environment = clamp(city.pillars.environment - envDrain * 0.5);

  city.budget += Math.round(gameConfig.budgetPerRound * curve.budgetMultiplier);

  if (city.debt > 0) {
    const interest = Math.round(city.debt * gameConfig.debtInterestRate);
    city.debt += interest;
    city.pillars.economy = clamp(city.pillars.economy - Math.round(interest / 3));
  }

  return city;
}

function marketModifiersFromEvent(event) {
  const fx = event?.effects || event?.flatEffects;
  if (!fx) return {};
  return {
    recyclablesPriceMultiplier: fx.recyclablesPriceMultiplier ?? 1,
    energyPriceMultiplier: fx.energyPriceMultiplier ?? 1,
    landfillCostMultiplier: fx.landfillCostMultiplier ?? 1,
    incinerationCostMultiplier: fx.incinerationCostMultiplier ?? 1,
    circularityIncomeMultiplier: fx.circularityIncomeMultiplier ?? 1,
  };
}

const LANDFILL_TIERS = new Set(['landfill', 'dump']);
const INCINERATE_TIERS = new Set(['incinerate']);

export function getMarginalCostMultiplier(city, card, marketModifiers = {}) {
  if (card.marginalCostCurve === 'circularity') {
    const circ = city.pillars.circularity;
    const { circularityThreshold, marginalMultiplier, maxMultiplier } =
      gameConfig.escalatingCostParams;
    if (circ <= circularityThreshold) return 1;
    const excess = circ - circularityThreshold;
    return Math.min(maxMultiplier, 1 + excess * 0.03 * marginalMultiplier);
  }
  if (card.marginalCostCurve === 'participation') {
    return 1 + (1 - city.participationRate) * 0.5;
  }
  return 1;
}

export function getCardCost(city, card, marketModifiers = {}) {
  let cost = card.baseCost;
  const archMod = card.archetypeModifiers?.[city.archetype];
  if (archMod?.baseCost) cost += archMod.baseCost;
  cost = Math.round(cost * getMarginalCostMultiplier(city, card, marketModifiers));

  if (LANDFILL_TIERS.has(card.hierarchyTier)) {
    cost = Math.round(cost * (marketModifiers.landfillCostMultiplier ?? 1));
  }
  if (INCINERATE_TIERS.has(card.hierarchyTier)) {
    cost = Math.round(cost * (marketModifiers.incinerationCostMultiplier ?? 1));
  }

  return Math.max(0, cost);
}

export function applyParticipation(city, card, effects) {
  const adjusted = { ...effects };
  const partFactor = card.participationFactor ?? 0;

  if (partFactor > 0) {
    const effective = city.participationRate * partFactor;
    for (const key of PILLAR_KEYS) {
      if (adjusted[key] > 0) adjusted[key] = Math.round(adjusted[key] * effective);
    }
  }

  if (partFactor < 0) {
    city.participationRate = clamp(
      city.participationRate + partFactor,
      0.1,
      gameConfig.participation.maxRate
    );
  } else if (partFactor > 0) {
    city.participationRate = clamp(
      city.participationRate + partFactor * 0.05,
      gameConfig.participation.baseRate,
      gameConfig.participation.maxRate
    );
  }

  const liveabilityBoost =
    city.pillars.liveability * gameConfig.participation.liveabilityFactor;
  city.participationRate = clamp(
    city.participationRate + liveabilityBoost * 0.01,
    0.1,
    gameConfig.participation.maxRate
  );

  return adjusted;
}

export function applyMarketEffects(city, card, round, marketModifiers = {}) {
  const effects = {};
  const recPrice =
    gameConfig.market.recyclablesPriceByRound[round - 1] *
    (marketModifiers.recyclablesPriceMultiplier ?? 1);
  const energyPrice =
    gameConfig.market.energyPriceByRound[round - 1] *
    (marketModifiers.energyPriceMultiplier ?? 1);

  if (card.marketExposure === 'recyclables') {
    const incomeMult = marketModifiers.circularityIncomeMultiplier ?? 1;
    let income = Math.round((recPrice - 1) * 8 * city.participationRate * incomeMult);
    effects.economy = income;
    if (recPrice < 0.7) effects.economy -= Math.round(8 * (2 - incomeMult));
    if (incomeMult < 1) effects.economy -= Math.round((1 - incomeMult) * 14);
  }
  if (card.marketExposure === 'energy') {
    const income = Math.round((energyPrice - 1) * 10);
    effects.economy = (effects.economy ?? 0) + income;
  }

  return effects;
}

export function applyStrategyCard(city, cardId, round, marketModifiers = {}) {
  const card = gameConfig.strategyCards.find((c) => c.id === cardId);
  if (!card) return { success: false, error: 'Unknown card' };

  const cost = getCardCost(city, card, marketModifiers);
  if (cost > city.budget) return { success: false, error: 'Insufficient budget' };

  city.budget -= cost;

  let effects = { ...card.effects };
  const archMod = card.archetypeModifiers?.[city.archetype];
  if (archMod?.effects) {
    for (const [k, v] of Object.entries(archMod.effects)) {
      effects[k] = (effects[k] ?? 0) + v;
    }
  }

  effects = applyParticipation(city, card, effects);
  const marketFx = applyMarketEffects(city, card, round, marketModifiers);
  for (const [k, v] of Object.entries(marketFx)) {
    effects[k] = (effects[k] ?? 0) + v;
  }

  for (const key of PILLAR_KEYS) {
    if (effects[key]) {
      city.pillars[key] = clamp(city.pillars[key] + effects[key]);
    }
  }

  if (card.financing === 'debt' && card.debtAmount) {
    city.debt += card.debtAmount;
    city.budget += Math.round(card.debtAmount * 0.6);
  }

  if (card.delayedEffects) {
    city.delayedEffects.push({
      ...card.delayedEffects,
      roundsRemaining: card.delayedEffects.roundsDelay,
      source: card.id,
    });
  }

  if (card.animationId && card.animationId !== 'none') {
    if (!city.builtAssets.includes(card.id)) city.builtAssets.push(card.id);
  }

  if (card.id === 'do-nothing') {
    applyInactionPenalty(city);
  }

  return { success: true, card, cost, effects, animationId: card.animationId };
}

export function processDelayedEffects(city) {
  const remaining = [];
  for (const delayed of city.delayedEffects) {
    delayed.roundsRemaining -= 1;
    if (delayed.roundsRemaining <= 0) {
      for (const key of PILLAR_KEYS) {
        if (delayed[key]) {
          city.pillars[key] = clamp(city.pillars[key] + delayed[key]);
        }
      }
    } else {
      remaining.push(delayed);
    }
  }
  city.delayedEffects = remaining;
}

export function applyStatusQuoDecay(city) {
  city.pillars.capacity = clamp(city.pillars.capacity - 7);
  city.pillars.environment = clamp(city.pillars.environment - 5);
  city.pillars.liveability = clamp(city.pillars.liveability - 3);
  city.pillars.economy = clamp(city.pillars.economy - 4);
}

export function applyInactionPenalty(city) {
  applyStatusQuoDecay(city);
}

export function applyWorldEvent(city, event, round) {
  const fx = event.effects || event.flatEffects || {};
  applyPillarDeltas(city, fx, true);
  applyPillarDeltas(city, applyWorldEventConditionals(city, event), false);
  return city;
}

function applyPillarDeltas(city, fx, useLegacyKeys) {
  const map = useLegacyKeys
    ? {
        environmentDelta: 'environment',
        liveabilityDelta: 'liveability',
        capacityDelta: 'capacity',
        economyDelta: 'economy',
        circularityDelta: 'circularity',
      }
    : null;

  for (const key of PILLAR_KEYS) {
    let delta = fx[key];
    if (map) {
      const legacy = Object.entries(map).find(([, v]) => v === key)?.[0];
      if (legacy && fx[legacy] != null) delta = (delta ?? 0) + fx[legacy];
    }
    if (delta) city.pillars[key] = clamp(city.pillars[key] + delta);
  }

  if (fx.wasteMultiplier) {
    city.wasteLoad = Math.round(city.wasteLoad * fx.wasteMultiplier);
    city.pillars.capacity = clamp(city.pillars.capacity - Math.round(fx.wasteMultiplier * 5));
  }
}

export function getEventActionCost(action, marketModifiers = {}) {
  const base = action?.cost ?? 0;
  if (base <= 0) return 0;
  const scale = gameConfig.eventActionCostMultiplier ?? 1;
  let cost = Math.round(base * scale);
  const tier = action?.hierarchyTier;
  if (LANDFILL_TIERS.has(tier)) {
    cost = Math.round(cost * (marketModifiers.landfillCostMultiplier ?? 1));
  }
  if (INCINERATE_TIERS.has(tier)) {
    cost = Math.round(cost * (marketModifiers.incinerationCostMultiplier ?? 1));
  }
  return Math.max(0, cost);
}

export function applyEventAction(city, action, round, marketModifiers = {}) {
  const cost = getEventActionCost(action, marketModifiers);
  if (cost > city.budget) return { success: false, error: 'Insufficient budget' };

  city.budget -= cost;

  const cardLike = {
    hierarchyTier: action.hierarchyTier,
    participationFactor: action.participationFactor ?? 0,
    marketExposure: action.marketExposure ?? 'none',
    financing: action.financing,
    debtAmount: action.debtAmount,
    delayedEffects: action.delayedEffects,
    animationId: action.animationId,
    id: action.id,
    marginalCostCurve: 'none',
  };

  let effects = { ...action.effects };
  effects = applyParticipation(city, cardLike, effects);
  const marketFx = applyMarketEffects(city, cardLike, round, marketModifiers);
  for (const [k, v] of Object.entries(marketFx)) {
    effects[k] = (effects[k] ?? 0) + v;
  }

  for (const key of PILLAR_KEYS) {
    if (effects[key]) {
      city.pillars[key] = clamp(city.pillars[key] + effects[key]);
    }
  }

  if (action.financing === 'debt' && action.debtAmount) {
    city.debt += action.debtAmount;
    city.budget += Math.round(action.debtAmount * 0.6);
  }

  if (action.delayedEffects) {
    city.delayedEffects.push({
      ...action.delayedEffects,
      roundsRemaining: action.delayedEffects.roundsDelay,
      source: action.id,
    });
  }

  if (action.animationId && action.animationId !== 'none') {
    const assetId = action.animationId;
    if (!city.builtAssets.includes(assetId)) city.builtAssets.push(assetId);
  }

  setCityFlags(city, action.setsFlags || []);
  clearCityFlags(city, action.clearsFlags || []);
  checkTransitionRules(city, action);

  return {
    success: true,
    action,
    cost,
    effects,
    animationId: action.animationId,
    resultExplain: action.resultExplain,
  };
}

export function resolveEventJustify(city, event, answerIndex) {
  const justify = event?.justify;
  if (!justify) return { correct: false };
  const correct = answerIndex === justify.correctIndex;
  recordQuizAnswer(city, correct);
  return { correct, conceptTag: justify.conceptTag };
}

export function advanceToNextEvent(city) {
  city.roundEventsResolved = (city.roundEventsResolved || 0) + 1;
  city.currentEventIndex = (city.currentEventIndex || 0) + 1;
  if (city.currentEventIndex >= (city.currentRoundEvents?.length || 0)) {
    city.roundComplete = true;
  }
  return getCurrentEvent(city);
}

export function recordQuizAnswer(city, correct) {
  if (correct) {
    city.insightPoints += gameConfig.insightBonusPerCorrect;
    city.quizStreak += 1;
  } else {
    city.quizStreak = 0;
  }
  city.insightPoints = Math.min(city.insightPoints, gameConfig.maxInsightBonus);
  return city;
}

export function calculateBalanceScore(city) {
  const p = city.pillars;
  const values = PILLAR_KEYS.map((k) => Math.max(p[k], 1));
  const product = values.reduce((a, b) => a * b, 1);
  const geoMean = Math.pow(product, 1 / 5);

  if (PILLAR_KEYS.some((k) => p[k] <= 0)) {
    city.crisisTriggered = true;
    return Math.round(geoMean * 0.5);
  }

  return Math.round(geoMean * 10) / 10;
}

export function calculateFinalScore(city) {
  city.balanceScore = calculateBalanceScore(city);
  city.score = Math.round((city.balanceScore + city.insightPoints) * 10) / 10;
  return city.score;
}

export function getPillarSpread(city) {
  const vals = PILLAR_KEYS.map((k) => city.pillars[k]);
  return Math.max(...vals) - Math.min(...vals);
}

export function rankCities(cities) {
  const ranked = [...cities].map((c) => {
    calculateFinalScore(c);
    return c;
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.insightPoints !== a.insightPoints) return b.insightPoints - a.insightPoints;
    const spreadA = getPillarSpread(a);
    const spreadB = getPillarSpread(b);
    if (spreadA !== spreadB) return spreadA - spreadB;
    if (b.pillars.liveability !== a.pillars.liveability)
      return b.pillars.liveability - a.pillars.liveability;
    const speedA = a.decisionsCount ? a.totalDecisionTime / a.decisionsCount : Infinity;
    const speedB = b.decisionsCount ? b.totalDecisionTime / b.decisionsCount : Infinity;
    return speedA - speedB;
  });

  ranked.forEach((c, i) => {
    c.rank = i + 1;
  });

  return ranked;
}

export function generateReportCard(city) {
  const p = city.pillars;
  const entries = PILLAR_KEYS.map((k) => ({ key: k, value: p[k] }));
  entries.sort((a, b) => a.value - b.value);
  const weakest = entries[0];
  const strongest = entries[entries.length - 1];

  const pillarLabels = {
    environment: '🌱 Environment',
    economy: '💰 Economy',
    liveability: '❤️ Liveability',
    capacity: '🗑️ Capacity',
    circularity: '♻️ Circularity',
  };

  const neglectAdvice = {
    environment: 'Review air/water pollution and GHG impacts from your waste choices.',
    economy: 'Your city overspent — consider debt, market exposure, and budget balance.',
    liveability: 'Public health and NIMBY matter — don\'t sacrifice residents for quick fixes.',
    capacity: 'Landfill headroom ran out — plan disposal capacity before crisis hits.',
    circularity: 'Push beyond linear metabolism — integrate reduce, reuse, and recycle.',
  };

  const verdicts = {
    1: 'A true Circular City — balanced sustainability champion!',
    2: 'Excellent balance — nearly perfect urban metabolism.',
    3: 'Strong performer — minor pillar gaps to address.',
  };

  let verdict =
    verdicts[city.rank] ??
    (city.rank <= 5
      ? 'Solid effort — review your weakest pillar for next time.'
      : city.rank <= 10
        ? 'Mixed results — sustainability requires balancing all five pillars.'
        : city.rank <= 15
          ? 'Significant gaps — one strategy dominated at the cost of others.'
          : 'Drowned in its waste hinterland — time to rethink the balance.');

  return {
    studentName: city.studentName,
    archetype: city.archetype,
    pillars: { ...p },
    balanceScore: city.balanceScore,
    insightPoints: city.insightPoints,
    finalScore: city.score,
    rank: city.rank,
    biggestWin: `${pillarLabels[strongest.key]} (${strongest.value})`,
    biggestMistake: `${pillarLabels[weakest.key]} (${weakest.value}) — ${neglectAdvice[weakest.key]}`,
    verdict,
    builtAssets: [...city.builtAssets],
  };
}

export function getScenario(round, scenariosByRound) {
  if (scenariosByRound?.[round]) return scenariosByRound[round];
  return gameConfig.scenarios.find((s) => s.round === round);
}

function seededShuffle(array, seed) {
  const arr = [...array];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateScenariosForGame(seed = Date.now()) {
  const byRound = {};
  for (const scenario of gameConfig.scenarios) {
    const pool = scenario.optionPool ?? scenario.options;
    const shuffled = seededShuffle(pool, seed + scenario.round * 997);
    byRound[scenario.round] = {
      ...scenario,
      options: shuffled.slice(0, 4),
    };
  }
  return byRound;
}

export function getStrategyCard(id) {
  return gameConfig.strategyCards.find((c) => c.id === id);
}

export function pickRandomWorldEvent(excludeIds = []) {
  return pickWorldEvent(excludeIds);
}

export function prepareRoundForCity(city, round, teacherWorldEvent) {
  return buildRoundEventQueue(city, round, teacherWorldEvent);
}

export function applyWorldEventFlatAndConditionals(city, worldEvent, round) {
  applyWorldEvent(city, worldEvent, round);
}

export {
  gameConfig,
  PILLAR_KEYS,
  marketModifiersFromEvent,
  foundingEvent,
  worldEventMarketModifiers,
  getCurrentEvent,
  buildRoundEventQueue,
};
