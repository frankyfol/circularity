"""Shuffle event actions so display order varies (circular is not always first)."""

from __future__ import annotations


def _hash_seed(seed: str | int) -> int:
    s = 0
    for ch in str(seed):
        s = (s * 31 + ord(ch)) & 0xFFFFFFFF
    return s or 1


def shuffle_actions(actions: list[dict], seed: str | int) -> list[dict]:
    if not actions:
        return []
    arr = list(actions)
    s = _hash_seed(seed)
    for i in range(len(arr) - 1, 0, -1):
        s = (s * 1103515245 + 12345) & 0x7FFFFFFF
        j = s % (i + 1)
        arr[i], arr[j] = arr[j], arr[i]
    return [
        {"action": action, "display_letter": chr(65 + index)}
        for index, action in enumerate(arr)
    ]


def shuffle_seed_for_event(event: dict | None, city_id: str | None, round_num: int | None) -> str:
    return f"{event.get('id') if event else 'ev'}:{city_id or 'city'}:{round_num or 0}"
