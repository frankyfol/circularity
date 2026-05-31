"""Free defer choice when an event has no zero-cost option."""

from __future__ import annotations


def event_has_zero_cost_option(actions: list[dict]) -> bool:
    return any((a.get("cost") or 0) == 0 for a in actions or [])


def create_defer_action(event: dict | None) -> dict:
    return {
        "id": "defer",
        "label": "Defer — act when budget allows",
        "plainLabel": "Defer — cannot afford to act now",
        "plainMeaning": (
            "Spend nothing this time. Waste and pressure may build until you can invest."
        ),
        "hierarchyTier": "defer",
        "cost": 0,
        "effects": {
            "economy": 1,
            "liveability": -2,
            "capacity": -3,
            "environment": -2,
        },
        "participationFactor": 0,
        "marketExposure": "none",
        "setsFlags": [],
        "clearsFlags": [],
        "resultExplain": "You kept your budget, but the underlying problem kept growing.",
        "animationId": "none",
        "pros": ["No spend — you keep budget for a later decision."],
        "cons": ["Problems do not wait — waste and pressure can build."],
        "isDefer": True,
        "conceptLink": (event or {}).get("conceptLink"),
    }


def actions_with_defer_option(event: dict) -> list[dict]:
    actions = list(event.get("actions") or [])
    if not event_has_zero_cost_option(actions):
        actions.append(create_defer_action(event))
    return actions
