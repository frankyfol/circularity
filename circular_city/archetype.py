"""Archetype-specific gameplay profiles."""

from __future__ import annotations

from circular_city.engine import game_config


def get_archetype_key(archetype: str) -> str:
    return "highIncome" if archetype == "highIncome" else "lowIncome"


def get_archetype_profile(archetype: str) -> dict:
    cfg = game_config()
    defaults = {
        "startingBudget": cfg.get("startingBudget", 48),
        "eventCostMultiplier": 1,
        "tierCostModifiers": {},
        "participationBase": cfg["participation"]["baseRate"],
        "participationGainMultiplier": 1,
        "budgetPerRoundMultiplier": 1,
        "economyDividendMultiplier": 1,
        "marketRecyclablesMultiplier": 1,
        "marketEnergyMultiplier": 1,
        "flowLeverMultiplier": {},
        "educationGainMultiplier": 1,
        "educationDecayExtra": 0,
        "collectionServiceRate": 0.95,
        "informalRecoveryBonus": 0,
        "populationBaseline": 500000,
        "populationGrowthStress": 1,
        "preferredEventThemes": [],
        "eventThemeWeightBoost": 1,
        "label": "City",
        "tagline": "",
    }
    key = get_archetype_key(archetype)
    return {**defaults, **(cfg.get("archetypeProfiles", {}).get(key, {}))}


def get_tier_cost_modifier(archetype: str, hierarchy_tier: str | None) -> float:
    profile = get_archetype_profile(archetype)
    return profile.get("tierCostModifiers", {}).get(hierarchy_tier or "", 1)


def event_theme_weight_bonus(event: dict, archetype: str) -> float:
    profile = get_archetype_profile(archetype)
    themes = profile.get("preferredEventThemes") or []
    boost = profile.get("eventThemeWeightBoost", 1)
    if not themes or boost <= 1:
        return 1
    hay = f"{event.get('theme', '')} {event.get('title', '')} {event.get('id', '')}".lower()
    if any(t.lower() in hay for t in themes):
        return boost
    return 1
