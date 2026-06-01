"""Shared room persistence for Streamlit multiplayer (memory or Upstash Redis)."""

from __future__ import annotations

import copy
import json
import os
import random
import string
import time
from abc import ABC, abstractmethod
from typing import Any

ROOM_TTL_SECONDS = 60 * 60 * 4  # 4 hours


def generate_room_code() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(chars) for _ in range(5))


def _normalize_code(code: str) -> str:
    return code.strip().upper()


def empty_room(host_id: str, code: str | None = None) -> dict[str, Any]:
    from circular_city.session_plan import create_teacher_session_config

    code = code or generate_room_code()
    return {
        "code": code,
        "hostId": host_id,
        "phase": "lobby",
        "currentRound": 0,
        "roundWorldEvents": {},
        "marketModifiers": {},
        "sessionConfig": create_teacher_session_config(),
        "cities": {},
        "createdAt": time.time(),
        "version": 0,
    }


class RoomStore(ABC):
    @abstractmethod
    def get(self, code: str) -> dict[str, Any] | None:
        pass

    @abstractmethod
    def save(self, room: dict[str, Any]) -> None:
        pass

    @abstractmethod
    def delete(self, code: str) -> None:
        pass

    def backend_name(self) -> str:
        return "unknown"


class MemoryRoomStore(RoomStore):
    """Shared in-process store — works for local `streamlit run` (all tabs, one server)."""

    _rooms: dict[str, dict[str, Any]] = {}

    def get(self, code: str) -> dict[str, Any] | None:
        room = self._rooms.get(_normalize_code(code))
        return copy.deepcopy(room) if room else None

    def save(self, room: dict[str, Any]) -> None:
        code = _normalize_code(room["code"])
        room["version"] = room.get("version", 0) + 1
        self._rooms[code] = copy.deepcopy(room)

    def delete(self, code: str) -> None:
        self._rooms.pop(_normalize_code(code), None)

    def backend_name(self) -> str:
        return "memory"


class RedisRoomStore(RoomStore):
    """Upstash Redis REST — required for Streamlit Cloud multi-user multiplayer."""

    def __init__(self, url: str, token: str) -> None:
        from upstash_redis import Redis

        self._redis = Redis(url=url, token=token)

    def _key(self, code: str) -> str:
        return f"circular_city:room:{_normalize_code(code)}"

    def get(self, code: str) -> dict[str, Any] | None:
        raw = self._redis.get(self._key(code))
        if not raw:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode()
        if isinstance(raw, str):
            return json.loads(raw)
        return raw

    def save(self, room: dict[str, Any]) -> None:
        code = _normalize_code(room["code"])
        room["version"] = room.get("version", 0) + 1
        self._redis.set(self._key(code), json.dumps(room), ex=ROOM_TTL_SECONDS)

    def delete(self, code: str) -> None:
        self._redis.delete(self._key(code))

    def backend_name(self) -> str:
        return "redis"


_store: RoomStore | None = None


def get_room_store() -> RoomStore:
    global _store
    if _store is not None:
        return _store

    url = os.environ.get("UPSTASH_REDIS_REST_URL", "")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")

    try:
        import streamlit as st

        if not url and hasattr(st, "secrets"):
            url = st.secrets.get("UPSTASH_REDIS_REST_URL", "") or url
            token = st.secrets.get("UPSTASH_REDIS_REST_TOKEN", "") or token
    except Exception:
        pass

    if url and token:
        _store = RedisRoomStore(url, token)
    else:
        _store = MemoryRoomStore()
    return _store


def is_redis_configured() -> bool:
    store = get_room_store()
    return store.backend_name() == "redis"
