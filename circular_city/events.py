"""Event database loading and branching selection logic."""

from __future__ import annotations

import copy
import json
import random
from pathlib import Path
from typing import Any

STACK_CAP = 4
REPEAT_PENALTY = 0.25
MIN_WEIGHT = 0.3
MAX_PER_THEME = 2

PRIMARY_FLAGS = [
    "PRIMARY_DISPOSE",
    "PRIMARY_INCINERATE",
    "PRIMARY_RECYCLE",
    "PRIMARY_REDUCE",
]
CIRCULAR_TIERS = {"reduce", "reuse", "recycle"}
DUMP_DUMP_TIER = "dump"

_DATA: dict[str, Any] | None = None


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_events_data() -> dict[str, Any]:
    global _DATA
    if _DATA is None:
        path = _repo_root() / "src" / "game" / "events.json"
        with open(path, encoding="utf-8") as f:
            _DATA = json.load(f)
    return _DATA


def get_founding_event() -> dict:
    return copy.deepcopy(load_events_data()["foundingEvent"])


def get_events_by_round() -> dict:
    return load_events_data()["eventsByRound"]


def get_world_events() -> list[dict]:
    return load_events_data()["worldEvents"]


def city_has_flag(city: dict, flag: str) -> bool:
    return flag in (city.get("flags") or [])


def get_city_flags(city: dict) -> list[str]:
    if city.get("flags") is None:
        city["flags"] = []
    return city["flags"]


def set_city_flags(city: dict, flags: list[str]) -> None:
    for flag in flags:
        if not city_has_flag(city, flag):
            get_city_flags(city).append(flag)
    _reconcile_exclusive_flags(city, flags)


def clear_city_flags(city: dict, flags: list[str]) -> None:
    city["flags"] = [f for f in get_city_flags(city) if f not in flags]


def _reconcile_exclusive_flags(city: dict, added: list[str]) -> None:
    if any(f in PRIMARY_FLAGS for f in added):
        keep = next((f for f in added if f in PRIMARY_FLAGS), None)
        city["flags"] = [
            f for f in get_city_flags(city) if f not in PRIMARY_FLAGS or f == keep
        ]
    if "PUBLIC_TRUST_HIGH" in added:
        clear_city_flags(city, ["PUBLIC_TRUST_LOW"])
    if "PUBLIC_TRUST_LOW" in added:
        clear_city_flags(city, ["PUBLIC_TRUST_HIGH"])
    if "INFORMAL_INTEGRATED" in added:
        clear_city_flags(city, ["INFORMAL_EVICTED"])
    if "INFORMAL_EVICTED" in added:
        clear_city_flags(city, ["INFORMAL_INTEGRATED"])
    if "CIRCULAR_PATH" in added:
        clear_city_flags(city, ["LINEAR_PATH"])


def is_event_eligible(event: dict, city: dict) -> bool:
    entry = event.get("entry") or {}
    flags = get_city_flags(city)
    requires = entry.get("requiresFlags") or []
    if requires and not all(f in flags for f in requires):
        return False
    requires_any = entry.get("requiresAnyFlags") or []
    if requires_any and not any(f in flags for f in requires_any):
        return False
    excluded = entry.get("excludedByFlags") or []
    if excluded and any(f in flags for f in excluded):
        return False
    return True


def compute_event_weight(event: dict, city: dict) -> float:
    entry = event.get("entry") or {}
    stack = 1.0
    for mod in entry.get("weightModifiers") or []:
        if city_has_flag(city, mod["ifFlag"]):
            stack *= mod["multiply"]
    stack = min(stack, STACK_CAP)
    w = (entry.get("baseWeight") or 1) * stack
    if event["id"] in (city.get("lastRoundEventIds") or []):
        w *= REPEAT_PENALTY
    return max(w, MIN_WEIGHT)


def _weighted_sample_distinct(weighted: list[dict], count: int, max_per_theme: int = MAX_PER_THEME) -> list[dict]:
    chosen: list[dict] = []
    themes: dict[str, int] = {}
    pool = list(weighted)

    while len(chosen) < count and pool:
        total = sum(x["w"] for x in pool)
        r = random.random() * total
        pick_idx = 0
        for i, item in enumerate(pool):
            r -= item["w"]
            if r <= 0:
                pick_idx = i
                break

        candidate = pool[pick_idx]
        theme = candidate["e"].get("theme") or candidate["e"]["id"]
        if themes.get(theme, 0) >= max_per_theme and len(pool) > count - len(chosen):
            pool.pop(pick_idx)
            continue

        chosen.append(candidate["e"])
        themes[theme] = themes.get(theme, 0) + 1
        pool.pop(pick_idx)

    if len(chosen) < count:
        remaining = [x["e"] for x in weighted if x["e"]["id"] not in {c["id"] for c in chosen}]
        for e in remaining:
            if len(chosen) >= count:
                break
            chosen.append(e)

    return chosen


def select_round_events(round_num: int, city: dict, count: int = 3) -> list[dict]:
    by_round = get_events_by_round()
    pool = by_round.get(str(round_num)) or by_round.get(round_num) or []
    candidates = [e for e in pool if is_event_eligible(e, city)]

    if not candidates:
        return copy.deepcopy(pool[: min(count, len(pool))])

    weighted = [{"e": e, "w": compute_event_weight(e, city)} for e in candidates]
    draw_count = min(count, len(candidates))
    max_theme = count + 1 if len(candidates) < count + 2 else MAX_PER_THEME
    return copy.deepcopy(_weighted_sample_distinct(weighted, draw_count, max_theme))


def build_round_event_queue(city: dict, round_num: int, teacher_world_event: dict | None = None) -> list[dict]:
    queue: list[dict] = []
    founding = get_founding_event()

    if round_num == 1:
        fe = copy.deepcopy(founding)
        fe["eventType"] = "founding"
        queue.append(fe)
        for e in select_round_events(1, city, 3):
            e = copy.deepcopy(e)
            e["eventType"] = "round"
            queue.append(e)
    else:
        for e in select_round_events(round_num, city, 3):
            e = copy.deepcopy(e)
            e["eventType"] = "round"
            queue.append(e)
        if teacher_world_event:
            we = copy.deepcopy(teacher_world_event)
            we["eventType"] = "world"
            queue.append(we)

    city["lastRoundEventIds"] = [e["id"] for e in queue if e.get("eventType") == "round"]
    city["currentRoundEvents"] = queue
    city["currentEventIndex"] = 0
    city["roundEventsResolved"] = 0
    city["roundComplete"] = False
    return queue


def get_current_event(city: dict) -> dict | None:
    idx = city.get("currentEventIndex") or 0
    events = city.get("currentRoundEvents") or []
    if idx < len(events):
        return events[idx]
    return None


def check_transition_rules(city: dict, action: dict) -> None:
    tier = action.get("hierarchyTier")
    if tier in CIRCULAR_TIERS:
        city["circularActionCount"] = city.get("circularActionCount", 0) + 1
        if city["circularActionCount"] >= 3:
            set_city_flags(city, ["CIRCULAR_PATH"])
            clear_city_flags(city, ["LINEAR_PATH"])
        if tier == "reduce" and not city_has_flag(city, "ZERO_WASTE_AMBITION"):
            effects = action.get("effects") or {}
            if action.get("cost", 0) >= 14 or effects.get("circularity", 0) >= 8:
                set_city_flags(city, ["ZERO_WASTE_AMBITION"])

    if tier == DUMP_DUMP_TIER:
        city["dumpActionCount"] = city.get("dumpActionCount", 0) + 1
        if city_has_flag(city, "CIRCULAR_PATH") and city["dumpActionCount"] >= 2:
            set_city_flags(city, ["LINEAR_PATH", "POLLUTION_LEGACY"])
            clear_city_flags(city, ["CIRCULAR_PATH"])


def apply_world_event_conditionals(city: dict, world_event: dict) -> dict:
    applied: dict[str, int] = {}
    for cond in world_event.get("conditionals") or []:
        if any(city_has_flag(city, f) for f in cond.get("ifFlags") or []):
            for k, v in (cond.get("effects") or {}).items():
                applied[k] = applied.get(k, 0) + v
    if not applied and world_event.get("defaultConditional"):
        for k, v in (world_event["defaultConditional"].get("effects") or {}).items():
            applied[k] = applied.get(k, 0) + v
    return applied


def world_event_market_modifiers(world_event: dict) -> dict:
    fx = world_event.get("flatEffects") or world_event.get("effects") or {}
    return {
        "recyclablesPriceMultiplier": fx.get("recyclablesPriceMultiplier", 1),
        "energyPriceMultiplier": fx.get("energyPriceMultiplier", 1),
        "landfillCostMultiplier": fx.get("landfillCostMultiplier", 1),
        "incinerationCostMultiplier": fx.get("incinerationCostMultiplier", 1),
        "circularityIncomeMultiplier": fx.get("circularityIncomeMultiplier", 1),
    }


def pick_world_event(exclude_ids: list[str] | None = None) -> dict:
    exclude_ids = exclude_ids or []
    available = [e for e in get_world_events() if e["id"] not in exclude_ids]
    return copy.deepcopy(random.choice(available))


def advance_to_next_event(city: dict) -> dict | None:
    city["roundEventsResolved"] = city.get("roundEventsResolved", 0) + 1
    city["currentEventIndex"] = city.get("currentEventIndex", 0) + 1
    if city["currentEventIndex"] >= len(city.get("currentRoundEvents") or []):
        city["roundComplete"] = True
    return get_current_event(city)
