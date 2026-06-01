"""Teacher-curated vs solo-random session plans — mirrors src/game/sessionPlan.js."""

from __future__ import annotations

import copy

from circular_city import events as ev
from circular_city.engine import game_config
from circular_city.quiz import apply_quiz_tier_to_events

ROUNDS = 6
ROUND_EVENTS_PER_YEAR = 3


def get_session_defaults() -> dict:
    return {
        "mode": "random",
        "quizTier": (game_config().get("quiz") or {}).get("defaultTier") or "standard",
        "rounds": {},
    }


def list_round_event_catalog(round_num: int) -> list[dict]:
    by_round = ev.get_events_by_round()
    pool = by_round.get(str(round_num)) or by_round.get(round_num) or []
    if pool:
        return [{"id": e["id"], "title": e["title"], "theme": e.get("theme")} for e in pool]
    data = ev.load_events_data()
    return [
        {"id": e["id"], "title": e["title"], "theme": e.get("theme")}
        for e in data.get("roundEvents") or []
        if e.get("round") == round_num
    ]


def list_world_event_catalog() -> list[dict]:
    worlds = ev.get_world_events() or game_config().get("worldEvents") or []
    return [
        {"id": e["id"], "name": e["name"], "lectureHook": e.get("lectureHook")}
        for e in worlds
    ]


def get_event_by_id_from_catalog(event_id: str) -> dict | None:
    founding = ev.get_founding_event()
    if founding.get("id") == event_id:
        return founding
    data = ev.load_events_data()
    for e in data.get("roundEvents") or []:
        if e.get("id") == event_id:
            return copy.deepcopy(e)
    for pool in ev.get_events_by_round().values():
        for e in pool:
            if e.get("id") == event_id:
                return copy.deepcopy(e)
    for e in ev.get_world_events():
        if e.get("id") == event_id:
            return copy.deepcopy(e)
    return None


def build_suggested_curated_plan(seed: int | None = None) -> dict:
    import time

    rounds: dict = {}
    s = seed if seed is not None else int(time.time() * 1000) & 0x7FFFFFFF

    def pick_n(arr: list, n: int) -> list:
        nonlocal s
        copy_arr = list(arr)
        out = []
        for _ in range(min(n, len(copy_arr))):
            s = (s * 1103515245 + 12345) & 0x7FFFFFFF
            j = s % len(copy_arr)
            out.append(copy_arr.pop(j))
        return out

    for round_num in range(1, ROUNDS + 1):
        catalog = [e["id"] for e in list_round_event_catalog(round_num)]
        picked = pick_n(catalog, min(ROUND_EVENTS_PER_YEAR, len(catalog)))
        world_event_id = None
        if round_num >= 2:
            worlds = [e["id"] for e in list_world_event_catalog()]
            s = (s * 1103515245 + 12345) & 0x7FFFFFFF
            world_event_id = worlds[s % len(worlds)] if worlds else None
        rounds[str(round_num)] = {"roundEventIds": picked, "worldEventId": world_event_id}
    return rounds


def create_teacher_session_config(overrides: dict | None = None) -> dict:
    overrides = overrides or {}
    return {
        "mode": "curated",
        "quizTier": overrides.get("quizTier") or get_session_defaults()["quizTier"],
        "rounds": overrides.get("rounds") or build_suggested_curated_plan(),
    }


def validate_session_plan(session_config: dict | None) -> list[str]:
    errors: list[str] = []
    if not session_config or not session_config.get("rounds"):
        errors.append("Missing round plan")
        return errors
    for round_num in range(1, ROUNDS + 1):
        key = str(round_num)
        plan = session_config["rounds"].get(key)
        if not plan:
            errors.append(f"Year {round_num} not configured")
            continue
        ids = plan.get("roundEventIds") or []
        if len(ids) != ROUND_EVENTS_PER_YEAR:
            errors.append(
                f"Year {round_num} needs exactly {ROUND_EVENTS_PER_YEAR} events (has {len(ids)})"
            )
        catalog = {e["id"] for e in list_round_event_catalog(round_num)}
        for eid in ids:
            if eid not in catalog:
                errors.append(f"Year {round_num}: unknown event {eid}")
        if len(set(ids)) != len(ids):
            errors.append(f"Year {round_num}: duplicate events selected")
        if round_num >= 2 and not plan.get("worldEventId"):
            errors.append(f"Year {round_num} needs a world event")
        if round_num == 1 and plan.get("worldEventId"):
            errors.append("Year 1 cannot have a world event")
    return errors


def _resolve_world_event_for_plan(session_config: dict, round_num: int) -> dict | None:
    if round_num < 2:
        return None
    eid = session_config.get("rounds", {}).get(str(round_num), {}).get("worldEventId")
    if not eid:
        return None
    return get_event_by_id_from_catalog(eid)


def build_round_event_queue_for_session(city: dict, round_num: int, session_config: dict | None) -> list[dict]:
    cfg = session_config or get_session_defaults()
    mode = cfg.get("mode") or "random"

    if mode == "random":
        world = None
        if round_num >= 2:
            wid = (cfg.get("randomWorldEvents") or {}).get(str(round_num))
            if wid:
                world = get_event_by_id_from_catalog(wid)
            if not world:
                world = _resolve_world_event_for_plan(
                    {**cfg, "rounds": cfg.get("randomWorldEvents") or {}}, round_num
                )
        return ev.build_round_event_queue(city, round_num, world)

    plan = cfg.get("rounds", {}).get(str(round_num))
    if not plan:
        return ev.build_round_event_queue(city, round_num, None)

    queue: list[dict] = []
    if round_num == 1:
        queue.append({**ev.get_founding_event(), "eventType": "founding"})
    for event_id in plan.get("roundEventIds") or []:
        evnt = get_event_by_id_from_catalog(event_id)
        if evnt:
            queue.append({**evnt, "eventType": "round"})
    world_ev = _resolve_world_event_for_plan(cfg, round_num)
    if world_ev and round_num >= 2:
        queue.append({**world_ev, "eventType": "world"})

    city["lastRoundEventIds"] = [e["id"] for e in queue if e.get("eventType") == "round"]
    city["currentRoundEvents"] = queue
    city["currentEventIndex"] = 0
    city["roundEventsResolved"] = 0
    city["roundComplete"] = False
    return queue


def prepare_round_for_session(city: dict, round_num: int, session_config: dict | None) -> list[dict]:
    queue = build_round_event_queue_for_session(city, round_num, session_config)
    tier = (session_config or {}).get("quizTier") or "standard"
    return apply_quiz_tier_to_events(queue, tier)


def schedule_random_world_events_for_solo(seed: int | None = None) -> dict:
    import time

    worlds = list_world_event_catalog()
    out: dict = {}
    s = seed if seed is not None else int(time.time() * 1000) & 0x7FFFFFFF
    used: list[str] = []
    for round_num in range(2, ROUNDS + 1):
        available = [w for w in worlds if w["id"] not in used]
        pool = available if available else worlds
        s = (s * 1103515245 + 12345) & 0x7FFFFFFF
        pick = pool[s % len(pool)]
        used.append(pick["id"])
        out[str(round_num)] = pick["id"]
    return out


def create_solo_session_config(quiz_tier: str | None = None, seed: int | None = None) -> dict:
    return {
        "mode": "random",
        "quizTier": quiz_tier or get_session_defaults()["quizTier"],
        "randomWorldEvents": schedule_random_world_events_for_solo(seed),
        "rounds": {},
    }
