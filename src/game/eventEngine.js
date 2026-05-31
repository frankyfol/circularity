import eventsData from './events.json' with { type: 'json' };
import { eventThemeWeightBonus } from './archetype.js';

export const { foundingEvent, roundEvents, worldEvents, eventsByRound } = eventsData;

const STACK_CAP = 4;
const REPEAT_PENALTY = 0.25;
const MIN_WEIGHT = 0.3;
const MAX_PER_THEME = 2;

const PRIMARY_FLAGS = [
  'PRIMARY_DISPOSE',
  'PRIMARY_INCINERATE',
  'PRIMARY_RECYCLE',
  'PRIMARY_REDUCE',
];
const TRUST_FLAGS = ['PUBLIC_TRUST_HIGH', 'PUBLIC_TRUST_LOW'];
const INFORMAL_FLAGS = ['INFORMAL_INTEGRATED', 'INFORMAL_EVICTED'];

const CIRCULAR_TIERS = new Set(['reduce', 'reuse', 'recycle']);
const DUMP_TIERS = new Set(['dump', 'landfill']);

export function getCityFlags(city) {
  if (!city.flags) city.flags = [];
  return city.flags;
}

export function cityHasFlag(city, flag) {
  return getCityFlags(city).includes(flag);
}

export function setCityFlags(city, flags = []) {
  for (const flag of flags) {
    if (!cityHasFlag(city, flag)) getCityFlags(city).push(flag);
  }
  reconcileExclusiveFlags(city, flags);
}

export function clearCityFlags(city, flags = []) {
  city.flags = getCityFlags(city).filter((f) => !flags.includes(f));
}

function reconcileExclusiveFlags(city, added) {
  if (added.some((f) => PRIMARY_FLAGS.includes(f))) {
    const keep = added.find((f) => PRIMARY_FLAGS.includes(f));
    city.flags = getCityFlags(city).filter(
      (f) => !PRIMARY_FLAGS.includes(f) || f === keep
    );
  }
  if (added.includes('PUBLIC_TRUST_HIGH')) {
    clearCityFlags(city, ['PUBLIC_TRUST_LOW']);
  }
  if (added.includes('PUBLIC_TRUST_LOW')) {
    clearCityFlags(city, ['PUBLIC_TRUST_HIGH']);
  }
  if (added.includes('INFORMAL_INTEGRATED')) {
    clearCityFlags(city, ['INFORMAL_EVICTED']);
  }
  if (added.includes('INFORMAL_EVICTED')) {
    clearCityFlags(city, ['INFORMAL_INTEGRATED']);
  }
  if (added.includes('CIRCULAR_PATH')) {
    clearCityFlags(city, ['LINEAR_PATH']);
  }
}

export function isEventEligible(event, city) {
  const entry = event.entry || {};
  const flags = getCityFlags(city);

  if (entry.requiresFlags?.length) {
    if (!entry.requiresFlags.every((f) => flags.includes(f))) return false;
  }
  if (entry.requiresAnyFlags?.length) {
    if (!entry.requiresAnyFlags.some((f) => flags.includes(f))) return false;
  }
  if (entry.excludedByFlags?.length) {
    if (entry.excludedByFlags.some((f) => flags.includes(f))) return false;
  }
  return true;
}

export function computeEventWeight(event, city) {
  const entry = event.entry || {};
  let stack = 1;
  for (const mod of entry.weightModifiers || []) {
    if (cityHasFlag(city, mod.ifFlag)) stack *= mod.multiply;
  }
  stack = Math.min(stack, STACK_CAP);
  let w = (entry.baseWeight ?? 1) * stack;

  if (city.lastRoundEventIds?.includes(event.id)) w *= REPEAT_PENALTY;
  w *= eventThemeWeightBonus(event, city.archetype);
  return Math.max(w, MIN_WEIGHT);
}

function weightedSampleDistinct(weighted, count, options = {}) {
  const { maxPerTheme = MAX_PER_THEME } = options;
  const chosen = [];
  const themes = {};
  let pool = [...weighted];

  while (chosen.length < count && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    let pickIdx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].w;
      if (r <= 0) {
        pickIdx = i;
        break;
      }
    }

    const candidate = pool[pickIdx];
    const theme = candidate.e.theme || candidate.e.id;
    const themeCount = themes[theme] || 0;

    if (themeCount >= maxPerTheme && pool.length > count - chosen.length) {
      pool.splice(pickIdx, 1);
      continue;
    }

    chosen.push(candidate.e);
    themes[theme] = themeCount + 1;
    pool.splice(pickIdx, 1);
  }

  if (chosen.length < count) {
    const remaining = weighted
      .map((x) => x.e)
      .filter((e) => !chosen.find((c) => c.id === e.id));
    for (const e of remaining) {
      if (chosen.length >= count) break;
      chosen.push(e);
    }
  }

  return chosen;
}

export function selectRoundEvents(round, city, count = 3) {
  const pool = eventsByRound[String(round)] || eventsByRound[round] || [];
  const candidates = pool.filter((e) => isEventEligible(e, city));

  if (candidates.length === 0) {
    return pool.slice(0, Math.min(count, pool.length));
  }

  const weighted = candidates.map((e) => ({
    e,
    w: computeEventWeight(e, city),
  }));

  const drawCount = Math.min(count, candidates.length);
  return weightedSampleDistinct(weighted, drawCount, {
    maxPerTheme: candidates.length < count + 2 ? count + 1 : MAX_PER_THEME,
  });
}

export function buildRoundEventQueue(city, round, teacherWorldEvent = null) {
  const queue = [];

  if (round === 1) {
    queue.push({ ...foundingEvent, eventType: 'founding' });
    const random = selectRoundEvents(1, city, 3);
    random.forEach((e) => queue.push({ ...e, eventType: 'round' }));
  } else {
    const random = selectRoundEvents(round, city, 3);
    random.forEach((e) => queue.push({ ...e, eventType: 'round' }));
    if (teacherWorldEvent) {
      queue.push({ ...teacherWorldEvent, eventType: 'world' });
    }
  }

  city.lastRoundEventIds = queue.filter((e) => e.eventType === 'round').map((e) => e.id);
  city.currentRoundEvents = queue;
  city.currentEventIndex = 0;
  city.roundEventsResolved = 0;
  city.roundComplete = false;

  return queue;
}

export function getCurrentEvent(city) {
  const idx = city.currentEventIndex ?? 0;
  return city.currentRoundEvents?.[idx] ?? null;
}

export function checkTransitionRules(city, action) {
  const tier = action.hierarchyTier;
  if (CIRCULAR_TIERS.has(tier)) {
    city.circularActionCount = (city.circularActionCount || 0) + 1;
    if (city.circularActionCount >= 3) {
      setCityFlags(city, ['CIRCULAR_PATH']);
      clearCityFlags(city, ['LINEAR_PATH']);
    }
    if (tier === 'reduce' && !cityHasFlag(city, 'ZERO_WASTE_AMBITION')) {
      if (action.cost >= 14 || (action.effects?.circularity ?? 0) >= 8) {
        setCityFlags(city, ['ZERO_WASTE_AMBITION']);
      }
    }
  }

  if (DUMP_TIERS.has(tier) && tier === 'dump') {
    city.dumpActionCount = (city.dumpActionCount || 0) + 1;
    if (cityHasFlag(city, 'CIRCULAR_PATH') && city.dumpActionCount >= 2) {
      setCityFlags(city, ['LINEAR_PATH', 'POLLUTION_LEGACY']);
      clearCityFlags(city, ['CIRCULAR_PATH']);
    }
  }
}

export function applyWorldEventConditionals(city, worldEvent) {
  const applied = {};
  for (const cond of worldEvent.conditionals || []) {
    const match = (cond.ifFlags || []).some((f) => cityHasFlag(city, f));
    if (match) {
      for (const [k, v] of Object.entries(cond.effects || {})) {
        applied[k] = (applied[k] ?? 0) + v;
      }
    }
  }
  if (worldEvent.defaultConditional && !Object.keys(applied).length) {
    for (const [k, v] of Object.entries(worldEvent.defaultConditional.effects || {})) {
      applied[k] = (applied[k] ?? 0) + v;
    }
  }
  return applied;
}

export function worldEventMarketModifiers(worldEvent) {
  const fx = worldEvent.flatEffects || worldEvent.effects || {};
  return {
    recyclablesPriceMultiplier: fx.recyclablesPriceMultiplier ?? 1,
    energyPriceMultiplier: fx.energyPriceMultiplier ?? 1,
    landfillCostMultiplier: fx.landfillCostMultiplier ?? 1,
    incinerationCostMultiplier: fx.incinerationCostMultiplier ?? 1,
    circularityIncomeMultiplier: fx.circularityIncomeMultiplier ?? 1,
  };
}

export function pickWorldEvent(excludeIds = []) {
  const available = worldEvents.filter((e) => !excludeIds.includes(e.id));
  return available[Math.floor(Math.random() * available.length)];
}

export function getEventById(id) {
  if (foundingEvent?.id === id) return foundingEvent;
  return roundEvents.find((e) => e.id === id) || worldEvents.find((e) => e.id === id);
}

export { eventsData };
