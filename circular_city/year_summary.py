"""Year-in-review summary generation."""

from __future__ import annotations

from circular_city.engine import PILLAR_KEYS, calculate_balance_score, calculate_final_score

FLAG_FORESHADOW = {
    "PRIMARY_DISPOSE": "Your disposal-first path will keep land and health pressures in the spotlight.",
    "DUMP_RELIANT": "Your open dump will haunt you — health risks and fires are rising.",
    "CIRCULAR_PATH": "Circular momentum is building — grants and markets may favour you.",
    "LINEAR_PATH": "Linear habits are stacking — expect more pollution and crisis events ahead.",
    "PUBLIC_TRUST_LOW": "Low public trust will make the next big policy harder.",
    "ZERO_WASTE_AMBITION": "Zero-waste ambition — late-game circular options are unlocking.",
}


def record_round_resolution(city: dict, event: dict, action: dict, effects: dict, score_before: float) -> None:
    if city.get("roundResolutions") is None:
        city["roundResolutions"] = []
    pros = action.get("pros") or []
    cons = action.get("cons") or []
    calculate_final_score(city)
    city["roundResolutions"].append(
        {
            "eventTitle": event.get("title"),
            "eventType": event.get("eventType"),
            "plainLabel": action.get("plainLabel") or action.get("label"),
            "pro": pros[0] if pros else "Helps your city balance.",
            "con": cons[0] if cons else "Trade-offs remain for later years.",
            "effects": dict(effects),
            "setsFlags": action.get("setsFlags") or [],
            "scoreBefore": score_before,
        }
    )


def generate_year_summary(city: dict, round_num: int) -> dict:
    resolutions = city.get("roundResolutions") or []
    calculate_final_score(city)
    score_now = (city.get("balanceScore") or 0) + city.get("insightPoints", 0)
    score_start = resolutions[0]["scoreBefore"] if resolutions else score_now
    score_change = round(score_now - score_start, 1)

    entries = [
        {
            "title": r["eventTitle"],
            "plainLabel": r["plainLabel"],
            "pro": r["pro"],
            "con": r["con"],
            "netEffect": ", ".join(
                f"{'+' if effects[k] > 0 else ''}{effects[k]} {k}"
                for k in PILLAR_KEYS
                if (effects := r.get("effects", {})).get(k)
            ),
        }
        for r in resolutions
    ]

    pillars = sorted(PILLAR_KEYS, key=lambda k: city["pillars"][k])
    weakest = pillars[0]
    spread = city["pillars"][pillars[-1]] - city["pillars"][weakest]

    if spread <= 15:
        verdict = f"Year {round_num} was relatively balanced — keep nurturing all five pillars."
    else:
        verdict = f"Year {round_num} left {weakest} as your weakest pillar ({city['pillars'][weakest]:.0f})."

    new_flags = {f for r in resolutions for f in r.get("setsFlags", [])}
    watches = [FLAG_FORESHADOW[f] for f in new_flags if f in FLAG_FORESHADOW][:2]

    return {
        "round": round_num,
        "cityName": city["studentName"],
        "population": city["population"],
        "wasteLoad": city["wasteLoad"],
        "entries": entries,
        "scoreChange": score_change,
        "verdict": verdict,
        "consequenceWatch": " ".join(watches) if watches else None,
    }


def display_label(action: dict) -> str:
    return action.get("plainLabel") or action.get("label", "")


def event_narration(event: dict) -> str:
    return event.get("scene") or event.get("brief", "")
