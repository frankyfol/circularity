"""Core game mechanics — Python port of src/game/engine.js."""

from __future__ import annotations

import copy
import json
import math
from pathlib import Path
from typing import Any

from circular_city import events as ev

PILLAR_KEYS = ["environment", "economy", "liveability", "capacity", "circularity"]
LANDFILL_TIERS = frozenset({"landfill", "dump"})
INCINERATE_TIERS = frozenset({"incinerate"})

_CONFIG: dict[str, Any] | None = None


def _load_config() -> dict[str, Any]:
    global _CONFIG
    if _CONFIG is None:
        path = Path(__file__).resolve().parent.parent / "src" / "game" / "gameConfig.json"
        with open(path, encoding="utf-8") as f:
            _CONFIG = json.load(f)
    return _CONFIG


def game_config() -> dict[str, Any]:
    return _load_config()


def clamp(value: float, min_val: float = 0, max_val: float = 100) -> float:
    return max(min_val, min(max_val, value))


def create_city(city_id: str, student_name: str, archetype: str) -> dict:
    from circular_city.waste_flow import init_waste_flow_state, is_waste_flow_enabled

    cfg = game_config()
    curve = cfg["growthCurves"][archetype]
    from circular_city.archetype import get_archetype_profile

    profile = get_archetype_profile(archetype)
    city = {
        "id": city_id,
        "studentName": student_name,
        "archetype": archetype,
        "pillars": copy.deepcopy(curve["startingPillars"]),
        "population": 500000 if archetype == "highIncome" else 800000,
        "affluence": 1.8 if archetype == "highIncome" else 0.6,
        "debt": 0,
        "participationRate": profile.get("participationBase", cfg["participation"]["baseRate"]),
        "insightPoints": 0,
        "budget": profile.get("startingBudget", cfg["startingBudget"]),
        "wasteLoad": 0,
        "footprint": 0,
        "decisionLog": [],
        "builtAssets": [],
        "delayedEffects": [],
        "score": 0,
        "balanceScore": 0,
        "rank": None,
        "quizStreak": 0,
        "totalDecisionTime": 0,
        "decisionsCount": 0,
        "crisisTriggered": False,
        "flags": [],
        "circularActionCount": 0,
        "dumpActionCount": 0,
        "lastRoundEventIds": [],
        "currentRoundEvents": [],
        "currentEventIndex": 0,
        "roundEventsResolved": 0,
        "roundComplete": False,
        "growthAppliedThisRound": False,
        "roundResolutions": [],
    }
    if is_waste_flow_enabled():
        init_waste_flow_state(city, archetype)
    return city


def apply_growth(city: dict, round_num: int, archetype: str | None = None) -> dict:
    archetype = archetype or city["archetype"]
    cfg = game_config()
    curve = cfg["growthCurves"][archetype]
    pop_growth = curve["populationGrowth"][round_num - 1] if round_num <= len(curve["populationGrowth"]) else 1.03
    aff_growth = curve["affluenceGrowth"][round_num - 1] if round_num <= len(curve["affluenceGrowth"]) else 1.03

    city["population"] = round(city["population"] * pop_growth)
    city["affluence"] = city["affluence"] * aff_growth

    from circular_city.archetype import get_archetype_profile

    profile = get_archetype_profile(archetype)
    pop_baseline = profile.get("populationBaseline", 500000)
    waste_factor = (city["population"] / pop_baseline) ** 1.15
    city["wasteLoad"] = round(
        curve["wastePerCapita"] * city["affluence"] * waste_factor * (round_num * 0.8 + 0.4)
    )
    city["footprint"] = round(city["wasteLoad"] * 1.4 * city["affluence"])

    from circular_city.waste_flow import is_waste_flow_enabled

    if not is_waste_flow_enabled():
        capacity_drain = round(city["wasteLoad"] / 120)
        city["pillars"]["capacity"] = clamp(city["pillars"]["capacity"] - capacity_drain)
        env_drain = round(city["wasteLoad"] / 200)
        city["pillars"]["environment"] = clamp(city["pillars"]["environment"] - env_drain * 0.5)

    city["budget"] += round(
        cfg["budgetPerRound"] * curve["budgetMultiplier"] * profile.get("budgetPerRoundMultiplier", 1)
    )

    if city["debt"] > 0:
        interest = round(city["debt"] * cfg["debtInterestRate"])
        city["debt"] += interest
        city["pillars"]["economy"] = clamp(city["pillars"]["economy"] - round(interest / 3))

    return city


def market_modifiers_from_event(event: dict | None) -> dict:
    if not event:
        return {}
    fx = event.get("effects") or event.get("flatEffects") or {}
    return {
        "recyclablesPriceMultiplier": fx.get("recyclablesPriceMultiplier", 1),
        "energyPriceMultiplier": fx.get("energyPriceMultiplier", 1),
        "landfillCostMultiplier": fx.get("landfillCostMultiplier", 1),
        "incinerationCostMultiplier": fx.get("incinerationCostMultiplier", 1),
        "circularityIncomeMultiplier": fx.get("circularityIncomeMultiplier", 1),
    }


def _apply_participation(city: dict, card: dict, effects: dict) -> dict:
    cfg = game_config()
    adjusted = dict(effects)
    part_factor = card.get("participationFactor") or 0

    if part_factor > 0:
        effective = city["participationRate"] * part_factor
        for key in PILLAR_KEYS:
            if adjusted.get(key, 0) > 0:
                adjusted[key] = round(adjusted[key] * effective)

    if part_factor < 0:
        city["participationRate"] = clamp(
            city["participationRate"] + part_factor,
            0.1,
            cfg["participation"]["maxRate"],
        )
    elif part_factor > 0:
        city["participationRate"] = clamp(
            city["participationRate"] + part_factor * 0.05,
            cfg["participation"]["baseRate"],
            cfg["participation"]["maxRate"],
        )

    liveability_boost = city["pillars"]["liveability"] * cfg["participation"]["liveabilityFactor"]
    city["participationRate"] = clamp(
        city["participationRate"] + liveability_boost * 0.01,
        0.1,
        cfg["participation"]["maxRate"],
    )
    return adjusted


def _apply_market_effects(city: dict, card: dict, round_num: int, market_modifiers: dict) -> dict:
    cfg = game_config()
    effects: dict[str, int] = {}
    rec_price = cfg["market"]["recyclablesPriceByRound"][round_num - 1] * market_modifiers.get(
        "recyclablesPriceMultiplier", 1
    )
    energy_price = cfg["market"]["energyPriceByRound"][round_num - 1] * market_modifiers.get(
        "energyPriceMultiplier", 1
    )

    if card.get("marketExposure") == "recyclables":
        income_mult = market_modifiers.get("circularityIncomeMultiplier", 1)
        income = round((rec_price - 1) * 8 * city["participationRate"] * income_mult)
        effects["economy"] = income
        if rec_price < 0.7:
            effects["economy"] = effects.get("economy", 0) - round(8 * (2 - income_mult))
        if income_mult < 1:
            effects["economy"] = effects.get("economy", 0) - round((1 - income_mult) * 14)

    if card.get("marketExposure") == "energy":
        income = round((energy_price - 1) * 10)
        effects["economy"] = effects.get("economy", 0) + income

    return effects


def _apply_pillar_deltas(city: dict, fx: dict, use_legacy: bool = True) -> None:
    legacy_map = {
        "environmentDelta": "environment",
        "liveabilityDelta": "liveability",
        "capacityDelta": "capacity",
        "economyDelta": "economy",
        "circularityDelta": "circularity",
    }

    for key in PILLAR_KEYS:
        delta = fx.get(key)
        if use_legacy:
            for leg, pillar in legacy_map.items():
                if fx.get(leg) is not None:
                    if pillar == key:
                        delta = (delta or 0) + fx[leg]
        if delta:
            city["pillars"][key] = clamp(city["pillars"][key] + delta)

    if fx.get("wasteMultiplier"):
        city["wasteLoad"] = round(city["wasteLoad"] * fx["wasteMultiplier"])
        city["pillars"]["capacity"] = clamp(
            city["pillars"]["capacity"] - round(fx["wasteMultiplier"] * 5)
        )


def apply_world_event(city: dict, event: dict, round_num: int) -> dict:
    fx = event.get("effects") or event.get("flatEffects") or {}
    _apply_pillar_deltas(city, fx, True)
    _apply_pillar_deltas(city, ev.apply_world_event_conditionals(city, event), False)
    return city


def get_event_action_cost(
    action: dict,
    market_modifiers: dict | None = None,
    archetype: str = "highIncome",
) -> int:
    from circular_city.archetype import get_archetype_profile, get_tier_cost_modifier

    market_modifiers = market_modifiers or {}
    base = action.get("cost") or 0
    if base <= 0:
        return 0
    cfg = game_config()
    profile = get_archetype_profile(archetype)
    scale = cfg.get("eventActionCostMultiplier", 1)
    tier = action.get("hierarchyTier")
    cost = round(base * scale * profile.get("eventCostMultiplier", 1))
    cost = round(cost * get_tier_cost_modifier(archetype, tier))
    if tier in LANDFILL_TIERS:
        cost = round(cost * market_modifiers.get("landfillCostMultiplier", 1))
    if tier in INCINERATE_TIERS:
        cost = round(cost * market_modifiers.get("incinerationCostMultiplier", 1))
    return max(0, cost)


def apply_event_action(
    city: dict,
    action: dict,
    round_num: int,
    market_modifiers: dict | None = None,
    event: dict | None = None,
) -> dict:
    market_modifiers = market_modifiers or {}
    cost = get_event_action_cost(action, market_modifiers, city["archetype"])
    if cost > city["budget"]:
        return {"success": False, "error": "Insufficient budget"}

    city["budget"] -= cost

    card_like = {
        "hierarchyTier": action.get("hierarchyTier"),
        "participationFactor": action.get("participationFactor", 0),
        "marketExposure": action.get("marketExposure", "none"),
        "financing": action.get("financing"),
        "debtAmount": action.get("debtAmount"),
        "delayedEffects": action.get("delayedEffects"),
        "animationId": action.get("animationId"),
        "id": action.get("id"),
    }

    effects = dict(action.get("effects") or {})
    effects = _apply_participation(city, card_like, effects)
    market_fx = _apply_market_effects(city, card_like, round_num, market_modifiers)
    for k, v in market_fx.items():
        effects[k] = effects.get(k, 0) + v

    for key in PILLAR_KEYS:
        if effects.get(key):
            city["pillars"][key] = clamp(city["pillars"][key] + effects[key])

    if action.get("financing") == "debt" and action.get("debtAmount"):
        city["debt"] += action["debtAmount"]
        city["budget"] += round(action["debtAmount"] * 0.6)

    if action.get("delayedEffects"):
        delayed = dict(action["delayedEffects"])
        delayed["roundsRemaining"] = delayed["roundsDelay"]
        delayed["source"] = action.get("id")
        city["delayedEffects"].append(delayed)

    anim = action.get("animationId")
    if anim and anim != "none" and anim not in city["builtAssets"]:
        city["builtAssets"].append(anim)

    ev.set_city_flags(city, action.get("setsFlags") or [])
    ev.clear_city_flags(city, action.get("clearsFlags") or [])
    ev.check_transition_rules(city, action)

    from circular_city.waste_flow import (
        apply_budget_economy_from_action,
        apply_flow_levers,
        is_waste_flow_enabled,
        resolve_flow_levers,
    )

    if is_waste_flow_enabled():
        apply_flow_levers(city, resolve_flow_levers(action, event), action.get("hierarchyTier"))
        apply_budget_economy_from_action(city, action, effects)

    return {
        "success": True,
        "action": action,
        "cost": cost,
        "effects": effects,
        "animationId": action.get("animationId"),
        "resultExplain": action.get("resultExplain"),
    }


def record_quiz_answer(city: dict, correct: bool) -> dict:
    cfg = game_config()
    if correct:
        city["insightPoints"] += cfg["insightBonusPerCorrect"]
        city["quizStreak"] += 1
    else:
        city["quizStreak"] = 0
    city["insightPoints"] = min(city["insightPoints"], cfg["maxInsightBonus"])
    return city


def resolve_event_justify(
    city: dict,
    event: dict,
    answer_index: int,
    shuffle_context: dict | None = None,
) -> dict:
    from circular_city.shuffle_actions import shuffle_justify_options, shuffle_seed_for_event

    justify = event.get("justify")
    if not justify:
        return {"correct": False}
    correct_index = justify["correctIndex"]
    if shuffle_context:
        seed = shuffle_seed_for_event(
            event,
            shuffle_context.get("cityId"),
            shuffle_context.get("round"),
        )
        correct_index = shuffle_justify_options(justify, seed)["correctIndex"]
    correct = answer_index == correct_index
    record_quiz_answer(city, correct)
    return {"correct": correct, "conceptTag": justify.get("conceptTag")}


def process_delayed_effects(city: dict) -> None:
    remaining = []
    for delayed in city["delayedEffects"]:
        delayed["roundsRemaining"] -= 1
        if delayed["roundsRemaining"] <= 0:
            for key in PILLAR_KEYS:
                if delayed.get(key):
                    city["pillars"][key] = clamp(city["pillars"][key] + delayed[key])
        else:
            remaining.append(delayed)
    city["delayedEffects"] = remaining


def calculate_balance_score(city: dict) -> float:
    p = city["pillars"]
    values = [max(p[k], 1) for k in PILLAR_KEYS]
    product = math.prod(values)
    geo_mean = product ** (1 / 5)

    if any(p[k] <= 0 for k in PILLAR_KEYS):
        city["crisisTriggered"] = True
        return round(geo_mean * 0.5, 1)

    return round(geo_mean, 1)


def calculate_final_score(city: dict) -> float:
    city["balanceScore"] = calculate_balance_score(city)
    city["score"] = round((city["balanceScore"] + city["insightPoints"]) * 10) / 10
    return city["score"]


def generate_report_card(city: dict) -> dict:
    p = city["pillars"]
    entries = sorted(PILLAR_KEYS, key=lambda k: p[k])
    weakest, strongest = entries[0], entries[-1]

    labels = {
        "environment": "🌱 Environment",
        "economy": "💰 Economy",
        "liveability": "❤️ Liveability",
        "capacity": "🗑️ Capacity",
        "circularity": "♻️ Circularity",
    }
    advice = {
        "environment": "Review air/water pollution and GHG impacts from your waste choices.",
        "economy": "Your city overspent — consider debt, market exposure, and budget balance.",
        "liveability": "Public health and NIMBY matter — don't sacrifice residents for quick fixes.",
        "capacity": "Landfill headroom ran out — plan disposal capacity before crisis hits.",
        "circularity": "Push beyond linear metabolism — integrate reduce, reuse, and recycle.",
    }
    verdicts = {
        1: "A true Circular City — balanced sustainability champion!",
        2: "Excellent balance — nearly perfect urban metabolism.",
        3: "Strong performer — minor pillar gaps to address.",
    }
    rank = city.get("rank") or 99
    if rank in verdicts:
        verdict = verdicts[rank]
    elif rank <= 5:
        verdict = "Solid effort — review your weakest pillar for next time."
    elif rank <= 10:
        verdict = "Mixed results — sustainability requires balancing all five pillars."
    elif rank <= 15:
        verdict = "Significant gaps — one strategy dominated at the cost of others."
    else:
        verdict = "Drowned in its waste hinterland — time to rethink the balance."

    return {
        "studentName": city["studentName"],
        "archetype": city["archetype"],
        "pillars": copy.deepcopy(p),
        "balanceScore": city["balanceScore"],
        "insightPoints": city["insightPoints"],
        "finalScore": city["score"],
        "rank": rank,
        "biggestWin": f"{labels[strongest]} ({p[strongest]})",
        "biggestMistake": f"{labels[weakest]} ({p[weakest]}) — {advice[weakest]}",
        "verdict": verdict,
        "builtAssets": list(city["builtAssets"]),
        "flags": list(city.get("flags") or []),
    }


def prepare_round_for_city(city: dict, round_num: int, teacher_world_event: dict | None = None) -> list[dict]:
    return ev.build_round_event_queue(city, round_num, teacher_world_event)


def get_current_event(city: dict) -> dict | None:
    return ev.get_current_event(city)


def advance_to_next_event(city: dict) -> dict | None:
    return ev.advance_to_next_event(city)


def get_pillar_spread(city: dict) -> float:
    vals = [city["pillars"][k] for k in PILLAR_KEYS]
    return max(vals) - min(vals)


def rank_cities(cities: list[dict]) -> list[dict]:
    ranked = [copy.deepcopy(c) for c in cities]
    for c in ranked:
        calculate_final_score(c)

    def sort_key(c: dict) -> tuple:
        speed = c["totalDecisionTime"] / c["decisionsCount"] if c.get("decisionsCount") else float("inf")
        return (
            -c["score"],
            -c["insightPoints"],
            get_pillar_spread(c),
            -c["pillars"]["liveability"],
            speed,
        )

    ranked.sort(key=sort_key)
    for i, c in enumerate(ranked):
        c["rank"] = i + 1
    return ranked


def schedule_world_events() -> dict[int, dict]:
    """Pre-pick one world event per round 2–6."""
    scheduled: dict[int, dict] = {}
    used: list[str] = []
    for r in range(2, 7):
        evnt = ev.pick_world_event(used)
        scheduled[r] = evnt
        used.append(evnt["id"])
    return scheduled
