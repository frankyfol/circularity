"""Quiz tier helpers — mirrors src/game/quiz.js."""

from __future__ import annotations

from circular_city.engine import game_config

QUIZ_TIERS = ("easy", "standard", "hard")


def get_quiz_config() -> dict:
    return game_config().get("quiz") or {}


def get_insight_bonus_for_tier(tier: str | None) -> int:
    cfg = get_quiz_config()
    by_tier = cfg.get("insightByTier") or {"easy": 2, "standard": 4, "hard": 6}
    if tier in by_tier:
        return int(by_tier[tier])
    return int(cfg.get("insightBonusPerCorrect") or game_config().get("insightBonusPerCorrect", 4))


def normalize_quiz_tier(tier: str | None) -> str:
    if tier in QUIZ_TIERS:
        return tier
    return get_quiz_config().get("defaultTier") or "standard"


def apply_quiz_tier_to_event(event: dict | None, tier: str | None) -> dict | None:
    if not event:
        return event
    t = normalize_quiz_tier(tier)
    copy = dict(event)
    tiers = event.get("justifyTiers")
    if tiers and t in tiers:
        copy["justify"] = dict(tiers[t])
        copy["activeQuizTier"] = t
    return copy


def apply_quiz_tier_to_events(events: list[dict], tier: str | None) -> list[dict]:
    return [apply_quiz_tier_to_event(e, tier) or e for e in (events or [])]


def get_explanation_for_answer(justify: dict | None, answer_index: int) -> str | None:
    if not justify:
        return None
    explanations = justify.get("optionExplanations") or []
    if not explanations or answer_index < 0 or answer_index >= len(explanations):
        return None
    return explanations[answer_index]
