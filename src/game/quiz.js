import gameConfig from './gameConfig.json' with { type: 'json' };

export const QUIZ_TIERS = ['easy', 'standard', 'hard'];

export function getQuizConfig() {
  return gameConfig.quiz || {};
}

export function getInsightBonusForTier(tier) {
  const cfg = getQuizConfig();
  const byTier = cfg.insightByTier || { easy: 2, standard: 4, hard: 6 };
  return byTier[tier] ?? cfg.insightBonusPerCorrect ?? 4;
}

export function normalizeQuizTier(tier) {
  if (QUIZ_TIERS.includes(tier)) return tier;
  return getQuizConfig().defaultTier || 'standard';
}

/** Attach active tier's justify block to a copy of the event. */
export function applyQuizTierToEvent(event, tier) {
  if (!event) return event;
  const t = normalizeQuizTier(tier);
  const copy = { ...event };
  const tiers = event.justifyTiers;
  if (tiers?.[t]) {
    copy.justify = { ...tiers[t] };
    copy.activeQuizTier = t;
  }
  return copy;
}

export function applyQuizTierToEvents(events, tier) {
  return (events || []).map((e) => applyQuizTierToEvent(e, tier));
}

export function getExplanationForAnswer(justify, answerIndex) {
  if (!justify?.optionExplanations?.length) return null;
  return justify.optionExplanations[answerIndex] ?? null;
}
