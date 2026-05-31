"""Year-in-review summary generation."""

from __future__ import annotations

from circular_city.engine import PILLAR_KEYS, calculate_balance_score, calculate_final_score

CIRCULAR_TIERS = frozenset({"reduce", "reuse", "recycle"})

FLAG_FORESHADOW = {
    "PRIMARY_DISPOSE": "Your disposal-first path will keep land and health pressures in the spotlight.",
    "PRIMARY_INCINERATE": "The incinerator path means emissions and neighbour trust will keep coming back.",
    "PRIMARY_RECYCLE": "Your recycling bet pays off when markets cooperate — but they can swing.",
    "PRIMARY_REDUCE": "Prevention-first choices compound — zero-waste doors are opening.",
    "LINEAR_PATH": "Linear habits are stacking — expect more pollution and crisis events ahead.",
    "CIRCULAR_PATH": "Circular momentum is building — grants and markets may favour you.",
    "DUMP_RELIANT": "Your open dump will haunt you — health risks and fires are rising.",
    "LANDFILL_BUILT": "Engineered landfill buys time — leachate and gas management matter now.",
    "INCINERATOR_BUILT": "The incinerator binds you — energy wins and air-quality fights ahead.",
    "RECYCLING_SYSTEM": "Recycling infrastructure helps you weather market shocks.",
    "TAX_IMPOSED": "New taxes may trigger backlash or illegal dumping.",
    "INFORMAL_INTEGRATED": "Integrated pickers are an asset — social wins may follow.",
    "INFORMAL_EVICTED": "Evict pickers may strike back — capacity could suffer.",
    "PUBLIC_TRUST_LOW": "Low public trust will make the next big policy harder.",
    "PUBLIC_TRUST_HIGH": "High trust makes the next siting or tax easier to sell.",
    "DEBT_HEAVY": "Heavy debt — the next budget squeeze will hurt more.",
    "POLLUTION_LEGACY": "Pollution is accumulating — heat and health events may bite harder.",
    "ZERO_WASTE_AMBITION": "Zero-waste ambition — late-game circular options are unlocking.",
}


def record_round_resolution(city: dict, event: dict, action: dict, effects: dict, score_before: float) -> None:
    if city.get("roundResolutions") is None:
        city["roundResolutions"] = []
    calculate_final_score(city)
    city["roundResolutions"].append(
        {
            "eventTitle": event.get("title"),
            "eventType": event.get("eventType"),
            "plainLabel": action.get("plainLabel") or action.get("label"),
            "plainMeaning": action.get("plainMeaning") or "",
            "hierarchyTier": action.get("hierarchyTier"),
            "pros": list(action.get("pros") or []),
            "cons": list(action.get("cons") or []),
            "effects": dict(effects),
            "setsFlags": action.get("setsFlags") or [],
            "scoreBefore": score_before,
        }
    )


def _build_balance_lesson(resolutions: list[dict]) -> str:
    circular_count = sum(
        1 for r in resolutions if r.get("hierarchyTier") in CIRCULAR_TIERS
    )
    lines = [
        'There is no single "always right" button — even circular-sounding options can strain '
        "budget, trust, or capacity if the timing is wrong. The winning strategy is balance "
        "across all five pillars, not picking the greenest label every time.",
    ]
    if circular_count >= len(resolutions) - 1 and len(resolutions) >= 2:
        lines.append(
            "You leaned circular this year. Watch whether economy or liveability are falling "
            "behind — recycling and reduction only pay off when residents participate and markets hold up."
        )
    elif circular_count == 0 and len(resolutions) >= 2:
        lines.append(
            "You avoided circular options this year. That can stabilise the budget short term, "
            "but land, health, or footprint pressures may build unless you invest in recovery or prevention later."
        )
    return " ".join(lines)


def generate_year_summary(city: dict, round_num: int) -> dict:
    resolutions = city.get("roundResolutions") or []
    calculate_final_score(city)
    score_now = (city.get("balanceScore") or 0) + city.get("insightPoints", 0)
    score_start = resolutions[0]["scoreBefore"] if resolutions else score_now
    score_change = round(score_now - score_start, 1)

    entries = []
    for r in resolutions:
        effects = r.get("effects") or {}
        net = ", ".join(
            f"{'+' if effects[k] > 0 else ''}{effects[k]} {k}"
            for k in PILLAR_KEYS
            if effects.get(k)
        )
        entries.append(
            {
                "title": r["eventTitle"],
                "plainLabel": r["plainLabel"],
                "plainMeaning": r.get("plainMeaning", ""),
                "pros": r.get("pros") or [],
                "cons": r.get("cons") or [],
                "netEffect": net,
            }
        )

    pillars = sorted(PILLAR_KEYS, key=lambda k: city["pillars"][k])
    weakest = pillars[0]
    spread = city["pillars"][pillars[-1]] - city["pillars"][weakest]

    if spread <= 15:
        verdict = (
            f"Year {round_num} kept your five pillars fairly balanced. "
            "The geometric-mean score rewards that balance more than maxing out any one "
            '"sustainable" choice.'
        )
    else:
        verdict = (
            f"Year {round_num} left {weakest} as your weakest pillar ({city['pillars'][weakest]:.0f}). "
            "Neglecting one pillar pulls down your overall score — even if other choices looked greener on paper."
        )

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
        "balanceLesson": _build_balance_lesson(resolutions),
        "consequenceWatch": " ".join(watches) if watches else None,
    }


def display_label(action: dict) -> str:
    return action.get("plainLabel") or action.get("label", "")


def event_narration(event: dict) -> str:
    return event.get("scene") or event.get("brief", "")
