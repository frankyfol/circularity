import gameConfig from './gameConfig.json' with { type: 'json' };

const DEFAULT_PROFILE = {
  label: 'City',
  tagline: '',
  startingBudget: 48,
  eventCostMultiplier: 1,
  tierCostModifiers: {},
  participationBase: 0.35,
  participationGainMultiplier: 1,
  budgetPerRoundMultiplier: 1,
  economyDividendMultiplier: 1,
  marketRecyclablesMultiplier: 1,
  marketEnergyMultiplier: 1,
  flowLeverMultiplier: {},
  educationGainMultiplier: 1,
  educationDecayExtra: 0,
  collectionServiceRate: 0.95,
  informalRecoveryBonus: 0,
  populationBaseline: 500000,
  populationGrowthStress: 1,
  preferredEventThemes: [],
  eventThemeWeightBoost: 1,
};

export function getArchetypeKey(archetype) {
  return archetype === 'highIncome' ? 'highIncome' : 'lowIncome';
}

export function getArchetypeProfile(archetype) {
  const key = getArchetypeKey(archetype);
  return { ...DEFAULT_PROFILE, ...(gameConfig.archetypeProfiles?.[key] || {}) };
}

export function getTierCostModifier(archetype, hierarchyTier) {
  const profile = getArchetypeProfile(archetype);
  return profile.tierCostModifiers?.[hierarchyTier] ?? 1;
}

export function scaleFlowLevers(levers, archetype) {
  if (!levers) return levers;
  const mult = getArchetypeProfile(archetype).flowLeverMultiplier || {};
  const tier = levers._tier;
  const tierMult = tier ? (mult[tier] ?? 1) : 1;
  const scaled = { ...levers };
  delete scaled._tier;

  const scale = (key, val) => {
    if (val == null || typeof val !== 'number') return;
    scaled[key] = val * tierMult;
  };
  scale('education', scaled.education);
  scale('reduceBonus', scaled.reduceBonus);
  scale('recycleCap', scaled.recycleCap);
  scale('incinCap', scaled.incinCap);
  scale('landfillCap', scaled.landfillCap);
  return scaled;
}

export function eventThemeWeightBonus(event, archetype) {
  const profile = getArchetypeProfile(archetype);
  const themes = profile.preferredEventThemes || [];
  if (!themes.length || profile.eventThemeWeightBoost <= 1) return 1;
  const hay = `${event.theme || ''} ${event.title || ''} ${event.id || ''}`.toLowerCase();
  const match = themes.some((t) => hay.includes(String(t).toLowerCase()));
  return match ? profile.eventThemeWeightBoost : 1;
}
