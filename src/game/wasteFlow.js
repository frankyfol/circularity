import gameConfig from './gameConfig.json' with { type: 'json' };
import { getArchetypeProfile } from './archetype.js';
import { cityHasFlag } from './eventEngine.js';

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/** Per-event action flow overrides (founding charter, etc.). */
const EVENT_FLOW_OVERRIDES = {
  r1_founding: {
    a: { landfillCap: 200 },
    b: { incinCap: 100 },
    c: { recycleCap: 40, education: 5 },
    d: { reduceBonus: 0.1, education: 8 },
  },
};

const GAS_CAPTURE_ACTION_IDS = new Set([
  'methane_capture',
  'carbon_market_capture',
]);

function wfConfig() {
  return gameConfig.wasteFlow || {};
}

function archKey(archetype) {
  return archetype === 'highIncome' ? 'highIncome' : 'lowIncome';
}

export function isWasteFlowEnabled() {
  return Boolean(wfConfig().enabled);
}

export function initWasteFlowState(city, archetype) {
  const wf = wfConfig();
  if (!wf.enabled) return city;
  const arch = archKey(archetype);
  city.education = wf.startEducation?.[arch] ?? 30;
  city.landfillCap = wf.startLandfillCap?.[arch] ?? 800;
  city.recycleCap = wf.startRecycleCap?.[arch] ?? 45;
  city.incinCap = 0;
  city.reduceBonus = 0;
  city.gasCapture = false;
  city.co2Cumulative = 0;
  city.uncollectedCum = 0;
  city.perCapita = wf.perCapita?.[arch] ?? 0.5;
  city.wms = 0;
  city.lastWasteFlow = null;
  city.forceUncollectedRound = false;
  return city;
}

export function ensureWasteFlowState(city) {
  if (!isWasteFlowEnabled()) return city;
  if (city.education == null) {
    initWasteFlowState(city, city.archetype || 'highIncome');
  }
  return city;
}

export function resolveFlowLevers(action, event = null) {
  const tier = action?.hierarchyTier || 'policy';
  const defaults = { ...(gameConfig.flowTierDefaults?.[tier] || {}) };
  const fromAction = { ...(action?.flow || {}) };
  const eventOverride =
    event?.id && EVENT_FLOW_OVERRIDES[event.id]?.[action?.id]
      ? EVENT_FLOW_OVERRIDES[event.id][action.id]
      : {};
  const merged = { ...defaults, ...eventOverride, ...fromAction };

  if (action?.id?.includes('methane') && merged.gasCapture == null) {
    const label = (action.plainLabel || action.label || '').toLowerCase();
    if (label.includes('capture') || label.includes('trap')) {
      merged.gasCapture = true;
    }
  }
  if (GAS_CAPTURE_ACTION_IDS.has(action?.id)) {
    merged.gasCapture = true;
  }
  return merged;
}

function applyEducationDelta(city, delta) {
  if (!delta) return;
  const eduCfg = gameConfig.education || {};
  let mult = getArchetypeProfile(city.archetype).educationGainMultiplier ?? 1;
  if (cityHasFlag(city, 'PUBLIC_TRUST_LOW')) {
    mult *= eduCfg.trustLowGainMultiplier ?? 0.5;
  } else if (cityHasFlag(city, 'PUBLIC_TRUST_HIGH')) {
    mult *= eduCfg.trustHighGainMultiplier ?? 1.25;
  }
  city.education = clamp(city.education + delta * mult);
}

export function applyFlowLevers(city, levers, hierarchyTier = null) {
  if (!isWasteFlowEnabled() || !levers) return;
  ensureWasteFlowState(city);
  const wf = wfConfig();
  const profile = getArchetypeProfile(city.archetype);
  const scaled = scaleFlowLeversInternal(
    { ...levers, _tier: hierarchyTier || levers._tier },
    city.archetype
  );

  if (scaled.education) applyEducationDelta(city, scaled.education);
  if (scaled.reduceBonus) {
    city.reduceBonus = Math.min(
      wf.reduceCap ?? 0.55,
      (city.reduceBonus || 0) + scaled.reduceBonus
    );
  }
  if (scaled.recycleCap) city.recycleCap = Math.max(0, (city.recycleCap || 0) + scaled.recycleCap);
  if (scaled.incinCap) city.incinCap = Math.max(0, (city.incinCap || 0) + scaled.incinCap);
  if (scaled.landfillCap) city.landfillCap = Math.max(0, (city.landfillCap || 0) + scaled.landfillCap);
  if (scaled.gasCapture) {
    city.gasCapture = true;
    if (!cityHasFlag(city, 'GAS_CAPTURE')) {
      city.flags = [...(city.flags || []), 'GAS_CAPTURE'];
    }
  }
  if (scaled.forcesUncollected) city.forceUncollectedRound = true;
}

function scaleFlowLeversInternal(levers, archetype) {
  const profile = getArchetypeProfile(archetype);
  const mult = profile.flowLeverMultiplier || {};
  const tier = levers._tier;
  const tierMult = tier ? (mult[tier] ?? 1) : 1;
  const scaled = { ...levers };
  delete scaled._tier;
  for (const key of ['education', 'reduceBonus', 'recycleCap', 'incinCap', 'landfillCap']) {
    if (typeof scaled[key] === 'number') scaled[key] *= tierMult;
  }
  return scaled;
}

export function applyBudgetEconomyFromAction(city, action, effects) {
  const link = gameConfig.budgetEconomyLink;
  if (!link?.enabled) return;
  const economyFx = effects?.economy ?? 0;
  city.budget += Math.round((link.economyDeltaToBudget ?? 0) * economyFx);
  city.budget += action?.budgetGain ?? 0;
}

function affluenceFactor(city) {
  const curve = gameConfig.growthCurves?.[city.archetype];
  const base = curve?.startAffluence ?? (city.archetype === 'highIncome' ? 1.8 : 0.6);
  return (city.affluence || base) / base;
}

function recyclablesPrice(round, marketModifiers = {}, archetype = 'highIncome') {
  const prices = gameConfig.market?.recyclablesPriceByRound || [];
  const base = prices[round - 1] ?? prices[prices.length - 1] ?? 1;
  const profile = getArchetypeProfile(archetype);
  return base * (marketModifiers.recyclablesPriceMultiplier ?? 1) * (profile.marketRecyclablesMultiplier ?? 1);
}

function energyPrice(round, marketModifiers = {}, archetype = 'highIncome') {
  const prices = gameConfig.market?.energyPriceByRound || [];
  const base = prices[round - 1] ?? prices[prices.length - 1] ?? 1;
  const profile = getArchetypeProfile(archetype);
  return base * (marketModifiers.energyPriceMultiplier ?? 1) * (profile.marketEnergyMultiplier ?? 1);
}

function archetypeWfScalars(archetype) {
  const wf = wfConfig();
  const arch = archKey(archetype);
  const eduMax = wf.eduReduceMax;
  const qFloor = wf.recycleQualityFloor;
  return {
    eduReduceMax: typeof eduMax === 'object' ? (eduMax[arch] ?? 0.28) : (eduMax ?? 0.3),
    recycleQualityFloor:
      typeof qFloor === 'object' ? (qFloor[arch] ?? 0.35) : (qFloor ?? 0.5),
  };
}

function sumRunningCosts(city) {
  const link = gameConfig.budgetEconomyLink;
  const costs = link?.infraRunningCost || {};
  let total = 0;
  for (const [flag, cost] of Object.entries(costs)) {
    if (cityHasFlag(city, flag)) total += cost;
  }
  return total;
}

export function runWasteFlow(city, round, marketModifiers = {}) {
  const wf = wfConfig();
  ensureWasteFlowState(city);

  if (cityHasFlag(city, 'GAS_CAPTURE')) city.gasCapture = true;

  const profile = getArchetypeProfile(city.archetype);
  const wfScalars = archetypeWfScalars(city.archetype);
  const afflu = affluenceFactor(city);
  const reduceFromEdu = wfScalars.eduReduceMax * ((city.education || 0) / 100);
  const reduceTotal = Math.min(wf.reduceCap ?? 0.55, reduceFromEdu + (city.reduceBonus || 0));

  let generated =
    (city.population / 1000) * (city.perCapita || 0.5) * afflu * (profile.populationGrowthStress ?? 1);
  const reduced = generated * reduceTotal;
  let stream = generated - reduced;

  const qualityFloor = wfScalars.recycleQualityFloor;
  const recycleQuality = qualityFloor + (1 - qualityFloor) * ((city.education || 0) / 100);
  let effectiveRecycleCap = city.recycleCap || 0;
  if (cityHasFlag(city, 'INFORMAL_INTEGRATED')) {
    effectiveRecycleCap *= 1 + (profile.informalRecoveryBonus ?? 0) * 3;
  }
  const recycled = Math.min(effectiveRecycleCap, stream) * recycleQuality;
  stream -= recycled;

  const incinerated = Math.min(city.incinCap || 0, stream);
  stream -= incinerated;
  const ashFraction = wf.ashFraction ?? 0.2;
  const ash = incinerated * ashFraction;

  let wantLandfill = stream + ash;
  if (city.forceUncollectedRound) {
    wantLandfill += stream * 0.5;
    stream = 0;
  }

  const landfilled = Math.min(city.landfillCap || 0, wantLandfill);
  city.landfillCap = Math.max(0, (city.landfillCap || 0) - landfilled);
  let uncollected = Math.max(0, wantLandfill - landfilled);
  const serviceGap = generated * Math.max(0, 1 - (profile.collectionServiceRate ?? 0.95));
  let leak = serviceGap;
  if (cityHasFlag(city, 'INFORMAL_INTEGRATED')) leak *= 0.35;
  if (cityHasFlag(city, 'RECYCLING_SYSTEM')) leak *= 0.7;
  uncollected += leak;
  city.uncollectedCum = (city.uncollectedCum || 0) + uncollected;

  const co2cfg = wf.co2 || {};
  const landfillFactor = city.gasCapture
    ? (co2cfg.landfillCaptured ?? 0.12)
    : (co2cfg.landfill ?? 0.4);
  let co2 =
    incinerated * (co2cfg.incinerate ?? 0.9) +
    landfilled * landfillFactor +
    uncollected * (co2cfg.uncollected ?? 0.6) +
    generated * (co2cfg.transport ?? 0.05) -
    recycled * (co2cfg.recycleCredit ?? 0.3);
  if ((city.incinCap || 0) > 0) {
    co2 -= incinerated * (co2cfg.energyCredit ?? 0.2);
  }
  co2 = Math.max(0, co2);
  city.co2Cumulative = (city.co2Cumulative || 0) + co2;

  const rPrice = recyclablesPrice(round, marketModifiers, city.archetype);
  const ePrice = energyPrice(round, marketModifiers, city.archetype);
  const energyMWh = incinerated * (wf.energyMWhPerTonne ?? 600);
  const recycleIncome = recycled * rPrice;
  const energyIncome = (energyMWh / 1000) * ePrice * 10;

  const D = generated > 0 ? (reduced + recycled) / generated : 0;
  const runway = landfilled > 0 ? city.landfillCap / landfilled : city.landfillCap > 0 ? 99 : 0;
  const cIntens = generated > 0 ? co2 / generated : 0;
  const uFrac = generated > 0 ? uncollected / generated : 0;

  const wmsCfg = wf.wms || {};
  let wms =
    100 *
    ((wmsCfg.wDiv ?? 0.35) * D +
      (wmsCfg.wRunway ?? 0.25) * Math.min(runway / (wmsCfg.runwayTargetYrs ?? 4), 1) +
      (wmsCfg.wCO2 ?? 0.25) * Math.max(0, 1 - cIntens / (wmsCfg.co2IntensityCap ?? 0.8)) +
      (wmsCfg.wUncollected ?? 0.15) * (1 - Math.min(uFrac, 1)));

  if (uFrac > (wf.uncollectedCrisisFraction ?? 0.25)) {
    wms *= wf.uncollectedCrisisMultiplier ?? 0.6;
  }
  if (city.landfillCap <= 0 && (city.incinCap || 0) < stream + ash) {
    wms *= wf.noRoomMultiplier ?? 0.7;
  }
  wms = Math.round(clamp(wms) * 10) / 10;
  city.wms = wms;

  const flow = {
    round,
    generated,
    reduced,
    recycled,
    incinerated,
    landfilled,
    uncollected,
    ash,
    co2,
    D,
    runway,
    cIntens,
    uFrac,
    wms,
    recycleIncome,
    energyIncome,
    education: city.education,
    landfillCapRemaining: city.landfillCap,
  };

  city.lastWasteFlow = flow;
  city.wasteLoad = Math.round(generated);
  city.forceUncollectedRound = false;

  return flow;
}

export function applyFlowToPillars(city, flow, round, marketModifiers = {}) {
  const wf = wfConfig();
  const pmap = wf.pillarMap || {};
  const runwayTarget = pmap.capacityFromRunwayYrs ?? 4;
  const co2Cap = pmap.environmentCO2Cap ?? 0.8;

  const economyNudge = city.pillars.economy;
  const liveabilityNudge = city.pillars.liveability;

  city.pillars.capacity = clamp(100 * Math.min(flow.runway / runwayTarget, 1));
  city.pillars.circularity = clamp(100 * flow.D);
  city.pillars.environment = clamp(
    100 * Math.max(0, 1 - flow.cIntens / co2Cap) -
      (pmap.environmentUncollectedPenalty ?? 40) * Math.min(flow.uFrac, 1)
  );

  const div = pmap.economyIncomeDivisor ?? 4;
  const running = sumRunningCosts(city);
  const link = gameConfig.budgetEconomyLink;
  const curve = gameConfig.growthCurves?.[city.archetype];
  const profile = getArchetypeProfile(city.archetype);
  const dividend =
    link?.enabled && city.pillars.economy >= (link.minEconomyForDividend ?? 1)
      ? (link.economyDividendPerRound ?? 0) *
        (city.pillars.economy / 100) *
        (profile.economyDividendMultiplier ?? 1)
      : 0;

  let budgetDelta = 0;
  if (link?.enabled && link.wasteIncomeToBudget) {
    budgetDelta += Math.round((flow.recycleIncome + flow.energyIncome) / div);
  }
  budgetDelta += Math.round(dividend - running);

  city.pillars.economy = clamp(
    economyNudge + Math.round(flow.recycleIncome / div + flow.energyIncome / div - running / 2)
  );
  city.pillars.liveability = clamp(
    liveabilityNudge +
      (pmap.liveabilityCollectionBonus ?? 8) * (1 - Math.min(flow.uFrac, 1)) -
      (pmap.liveabilityUncollectedPenalty ?? 10) * Math.min(flow.uFrac, 1)
  );

  city.budget += budgetDelta;

  return flow;
}

export function decayEducation(city) {
  const wf = wfConfig();
  const profile = getArchetypeProfile(city.archetype);
  const decay =
    (wf.eduDecayPerRound ?? gameConfig.education?.decayPerRound ?? 2) +
    (profile.educationDecayExtra ?? 0);
  city.education = clamp((city.education || 0) - decay);
}

export function finalizeRoundWasteFlow(city, round, marketModifiers = {}) {
  if (!isWasteFlowEnabled()) return null;
  ensureWasteFlowState(city);
  decayEducation(city);
  const flow = runWasteFlow(city, round, marketModifiers);
  applyFlowToPillars(city, flow, round, marketModifiers);
  return flow;
}

export function getWmsGradeLabel(wms) {
  const grades = wfConfig().wms?.grades || [
    { min: 0, label: 'Failing' },
    { min: 40, label: 'Struggling' },
    { min: 60, label: 'Improving' },
    { min: 80, label: 'Circular Leader' },
  ];
  let label = grades[0]?.label ?? '—';
  for (const g of grades) {
    if (wms >= g.min) label = g.label;
  }
  return label;
}
