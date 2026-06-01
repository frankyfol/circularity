"""Room lifecycle for teacher + student multiplayer."""

from __future__ import annotations

import copy
from typing import Any

from circular_city.engine import (
    calculate_final_score,
    create_city,
    prepare_round_for_city,
    rank_cities,
)
from circular_city.session_plan import validate_session_plan
from circular_city.events import pick_world_event
from circular_city.room_store import empty_room, generate_room_code, get_room_store


def _world_event_for_round(room: dict, round_num: int) -> dict | None:
    """Display helper for teacher dashboard (curated plan or legacy random)."""
    if round_num < 2:
        return None
    key = str(round_num)
    cfg = room.get("sessionConfig") or {}
    if cfg.get("mode") == "curated":
        from circular_city.session_plan import get_event_by_id_from_catalog

        wid = cfg.get("rounds", {}).get(key, {}).get("worldEventId")
        if wid:
            return get_event_by_id_from_catalog(wid)
    events = room.setdefault("roundWorldEvents", {})
    return events.get(key)


def get_leaderboard(room: dict) -> list[dict]:
    cities = list(room.get("cities", {}).values())
    if not cities:
        return []
    ranked = rank_cities(cities)
    for i, c in enumerate(ranked):
        c["rank"] = i + 1
    return [
        {
            "id": c["id"],
            "studentName": c["studentName"],
            "archetype": c["archetype"],
            "score": c["score"],
            "balanceScore": c["balanceScore"],
            "insightPoints": c["insightPoints"],
            "pillars": copy.deepcopy(c["pillars"]),
            "rank": c["rank"],
            "roundComplete": c.get("roundComplete", False),
            "flags": list(c.get("flags") or []),
        }
        for c in ranked
    ]


def create_host_room(host_id: str) -> dict:
    store = get_room_store()
    room = empty_room(host_id)
    store.save(room)
    return room


def join_room(code: str, player_id: str, student_name: str, archetype: str) -> tuple[dict | None, str | None]:
    store = get_room_store()
    room = store.get(code)
    if not room:
        return None, "Room not found — check the code with your teacher."

    if room["phase"] not in ("lobby", "playing"):
        return None, "This game has already finished."

    cities = room.setdefault("cities", {})
    if player_id not in cities:
        cities[player_id] = create_city(player_id, student_name, archetype)
        store.save(room)
    return room, None


def load_room(code: str) -> dict | None:
    return get_room_store().get(code)


def save_room(room: dict) -> None:
    get_room_store().save(room)


def update_player_city(code: str, player_id: str, city: dict) -> dict | None:
    store = get_room_store()
    room = store.get(code)
    if not room:
        return None
    room["cities"][player_id] = city
    store.save(room)
    return room


def start_game(code: str, host_id: str) -> tuple[dict | None, str | None]:
    store = get_room_store()
    room = store.get(code)
    if not room:
        return None, "Room not found"
    if room["hostId"] != host_id:
        return None, "Only the teacher host can start the game"
    if len(room.get("cities", {})) == 0:
        return None, "Wait for at least one student to join"

    cfg = room.setdefault("sessionConfig", {})
    errors = validate_session_plan(cfg)
    if errors:
        return None, "; ".join(errors)

    room["phase"] = "playing"
    room["currentRound"] = 1
    room["marketModifiers"] = {}
    room["roundWorldEvents"] = _world_events_snapshot(room)

    for city in room["cities"].values():
        city["sessionConfig"] = copy.deepcopy(cfg)
        _reset_city_for_round(city, room, 1)

    store.save(room)
    return room, None


def advance_round(code: str, host_id: str) -> tuple[dict | None, str | None]:
    store = get_room_store()
    room = store.get(code)
    if not room:
        return None, "Room not found"
    if room["hostId"] != host_id:
        return None, "Only the teacher can advance the round"

    if room["currentRound"] >= 6:
        room["phase"] = "reveal"
        cities = list(room["cities"].values())
        ranked = rank_cities(cities)
        for i, c in enumerate(ranked):
            c["rank"] = i + 1
            room["cities"][c["id"]] = c
        store.save(room)
        return room, None

    next_round = room["currentRound"] + 1
    room["currentRound"] = next_round
    room["marketModifiers"] = {}

    for city in room["cities"].values():
        _reset_city_for_round(city, room, next_round)

    store.save(room)
    return room, None


def update_session_config(code: str, host_id: str, session_config: dict) -> tuple[dict | None, str | None]:
    store = get_room_store()
    room = store.get(code)
    if not room:
        return None, "Room not found"
    if room["hostId"] != host_id:
        return None, "Only the teacher can configure the session"
    if room["phase"] != "lobby":
        return None, "Session can only be edited before the game starts"

    errors = validate_session_plan(session_config)
    if errors:
        return None, "; ".join(errors)

    room["sessionConfig"] = copy.deepcopy(session_config)
    store.save(room)
    return room, None


def _world_events_snapshot(room: dict) -> dict:
    from circular_city.session_plan import get_event_by_id_from_catalog

    cfg = room.get("sessionConfig") or {}
    out: dict = {}
    if cfg.get("mode") == "curated":
        for r in range(2, 7):
            wid = cfg.get("rounds", {}).get(str(r), {}).get("worldEventId")
            if wid:
                evnt = get_event_by_id_from_catalog(wid)
                if evnt:
                    out[str(r)] = evnt
        return out
    used: list[str] = []
    for r in range(2, 7):
        evnt = pick_world_event(used)
        out[str(r)] = evnt
        used.append(evnt["id"])
    return out


def reroll_world_event(code: str, host_id: str, round_num: int) -> tuple[dict | None, str | None]:
    store = get_room_store()
    room = store.get(code)
    if not room:
        return None, "Room not found"
    if room["hostId"] != host_id:
        return None, "Only the teacher can change world events"
    if round_num < 2:
        return None, "World events apply from year 2 onward"

    cfg = room.setdefault("sessionConfig", {})
    if cfg.get("mode") == "curated":
        from circular_city.session_plan import list_world_event_catalog

        worlds = list_world_event_catalog()
        used = [
            cfg["rounds"][k]["worldEventId"]
            for k in cfg.get("rounds", {})
            if k != str(round_num) and cfg["rounds"][k].get("worldEventId")
        ]
        available = [w for w in worlds if w["id"] not in used]
        pool = available if available else worlds
        if pool:
            import random

            pick = random.choice(pool)
            cfg.setdefault("rounds", {}).setdefault(str(round_num), {})["worldEventId"] = pick["id"]
            room["roundWorldEvents"] = _world_events_snapshot(room)
    else:
        events = room.setdefault("roundWorldEvents", {})
        used = [e["id"] for k, e in events.items() if str(k) != str(round_num)]
        events[str(round_num)] = pick_world_event(used)
    store.save(room)
    return room, None


def _reset_city_for_round(city: dict, room: dict, round_num: int) -> None:
    cfg = room.get("sessionConfig") or city.get("sessionConfig")
    prepare_round_for_city(city, round_num, cfg)
    city["growthAppliedThisRound"] = False
    city["roundComplete"] = False
    city["roundResolutions"] = []


def sync_player_round(
    room: dict,
    player_id: str,
    local_sync_key: str | None,
) -> tuple[dict | None, str | None, bool]:
    """
    Returns (city, new_sync_key, should_reset_ui).
  If room round/phase changed, re-prepares the player's city for that round.
    """
    sync_key = f"{room['phase']}:{room['currentRound']}"
    if sync_key == local_sync_key:
        city = room.get("cities", {}).get(player_id)
        return city, local_sync_key, False

    city = room.get("cities", {}).get(player_id)
    if not city:
        return None, local_sync_key, False

    if room["phase"] == "playing" and room["currentRound"] > 0:
        _reset_city_for_round(city, room, room["currentRound"])
        room["cities"][player_id] = city
        save_room(room)
        return city, sync_key, True

    if room["phase"] == "reveal":
        calculate_final_score(city)
        return city, sync_key, True

    return city, sync_key, False


def count_round_complete(room: dict) -> tuple[int, int]:
    cities = list(room.get("cities", {}).values())
    if not cities:
        return 0, 0
    done = sum(1 for c in cities if c.get("roundComplete"))
    return done, len(cities)
