"""Waste-flow simulation — Python port of src/game/wasteFlow.js."""

from __future__ import annotations

from circular_city.archetype import get_archetype_profile
from circular_city.engine import clamp, game_config
from circular_city.events import city_has_flag

EVENT_FLOW_OVERRIDES = {
    "r1_founding": {
        "a": {"landfillCap": 200},
        "b": {"incinCap": 100},
        "c": {"recycleCap": 40, "education": 5},
        "d": {"reduceBonus": 0.1, "education": 8},
    },
}


def _wf() -> dict:
    return game_config().get("wasteFlow") or {}


def is_waste_flow_enabled() -> bool:
    return bool(_wf().get("enabled"))


def _arch(archetype: str) -> str:
    return "highIncome" if archetype == "highIncome" else "lowIncome"


def init_waste_flow_state(city: dict, archetype: str) -> dict:
    wf = _wf()
    if not wf.get("enabled"):
        return city
    arch = _arch(archetype)
    city["education"] = wf.get("startEducation", {}).get(arch, 30)
    city["landfillCap"] = wf.get("startLandfillCap", {}).get(arch, 800)
    city["recycleCap"] = wf.get("startRecycleCap", {}).get(arch, 45)
    city["incinCap"] = 0
    city["reduceBonus"] = 0
    city["gasCapture"] = False
    city["co2Cumulative"] = 0
    city["uncollectedCum"] = 0
    city["perCapita"] = wf.get("perCapita", {}).get(arch, 0.5)
    city["wms"] = 0
    city["lastWasteFlow"] = None
    city["forceUncollectedRound"] = False
    return city


def ensure_waste_flow_state(city: dict) -> dict:
    if not is_waste_flow_enabled():
        return city
    if city.get("education") is None:
        init_waste_flow_state(city, city.get("archetype", "highIncome"))
    return city


def resolve_flow_levers(action: dict, event: dict | None = None) -> dict:
    tier = action.get("hierarchyTier") or "policy"
    defaults = dict(game_config().get("flowTierDefaults", {}).get(tier, {}))
    merged = {**defaults, **(action.get("flow") or {})}
    if event and event.get("id") in EVENT_FLOW_OVERRIDES:
        ov = EVENT_FLOW_OVERRIDES[event["id"]].get(action.get("id"))
        if ov:
            merged = {**merged, **ov}
    label = (action.get("plainLabel") or action.get("label") or "").lower()
    if "methane" in (action.get("id") or "") and ("capture" in label or "trap" in label):
        merged["gasCapture"] = True
    return merged


def _wf_archetype_scalars(archetype: str) -> dict:
    wf = _wf()
    arch = "highIncome" if archetype == "highIncome" else "lowIncome"
    edu = wf.get("eduReduceMax", 0.3)
    qf = wf.get("recycleQualityFloor", 0.5)
    return {
        "eduReduceMax": edu[arch] if isinstance(edu, dict) else edu,
        "recycleQualityFloor": qf[arch] if isinstance(qf, dict) else qf,
    }


def _edu_delta(city: dict, delta: float) -> None:
    if not delta:
        return
    edu_cfg = game_config().get("education", {})
    mult = get_archetype_profile(city["archetype"]).get("educationGainMultiplier", 1)
    if city_has_flag(city, "PUBLIC_TRUST_LOW"):
        mult *= edu_cfg.get("trustLowGainMultiplier", 0.5)
    elif city_has_flag(city, "PUBLIC_TRUST_HIGH"):
        mult *= edu_cfg.get("trustHighGainMultiplier", 1.25)
    city["education"] = clamp(city.get("education", 0) + delta * mult)


def _scale_levers(levers: dict, archetype: str, hierarchy_tier: str | None) -> dict:
    profile = get_archetype_profile(archetype)
    mult_map = profile.get("flowLeverMultiplier") or {}
    tier_mult = mult_map.get(hierarchy_tier or "", 1)
    scaled = dict(levers)
    for key in ("education", "reduceBonus", "recycleCap", "incinCap", "landfillCap"):
        if isinstance(scaled.get(key), (int, float)):
            scaled[key] = scaled[key] * tier_mult
    return scaled


def apply_flow_levers(city: dict, levers: dict, hierarchy_tier: str | None = None) -> None:
    if not is_waste_flow_enabled() or not levers:
        return
    ensure_waste_flow_state(city)
    wf = _wf()
    scaled = _scale_levers(levers, city["archetype"], hierarchy_tier)
    if scaled.get("education"):
        _edu_delta(city, scaled["education"])
    if scaled.get("reduceBonus"):
        city["reduceBonus"] = min(
            wf.get("reduceCap", 0.55),
            city.get("reduceBonus", 0) + scaled["reduceBonus"],
        )
    if scaled.get("recycleCap"):
        city["recycleCap"] = max(0, city.get("recycleCap", 0) + scaled["recycleCap"])
    if scaled.get("incinCap"):
        city["incinCap"] = max(0, city.get("incinCap", 0) + scaled["incinCap"])
    if scaled.get("landfillCap"):
        city["landfillCap"] = max(0, city.get("landfillCap", 0) + scaled["landfillCap"])
    if scaled.get("gasCapture"):
        city["gasCapture"] = True
        if not city_has_flag(city, "GAS_CAPTURE"):
            city.setdefault("flags", []).append("GAS_CAPTURE")
    if levers.get("forcesUncollected"):
        city["forceUncollectedRound"] = True


def apply_budget_economy_from_action(city: dict, action: dict, effects: dict) -> None:
    link = game_config().get("budgetEconomyLink") or {}
    if not link.get("enabled"):
        return
    city["budget"] += round(link.get("economyDeltaToBudget", 0) * (effects.get("economy") or 0))
    city["budget"] += action.get("budgetGain") or 0


def run_waste_flow(city: dict, round_num: int, market_modifiers: dict | None = None) -> dict:
    market_modifiers = market_modifiers or {}
    wf = _wf()
    ensure_waste_flow_state(city)
    if city_has_flag(city, "GAS_CAPTURE"):
        city["gasCapture"] = True

    curve = game_config()["growthCurves"][city["archetype"]]
    base_aff = curve.get("startAffluence", 1.8 if city["archetype"] == "highIncome" else 0.6)
    afflu = (city.get("affluence") or base_aff) / base_aff

    profile = get_archetype_profile(city["archetype"])
    scalars = _wf_archetype_scalars(city["archetype"])
    reduce_from_edu = scalars["eduReduceMax"] * (city.get("education", 0) / 100)
    reduce_total = min(wf.get("reduceCap", 0.55), reduce_from_edu + city.get("reduceBonus", 0))

    generated = (
        (city["population"] / 1000)
        * city.get("perCapita", 0.5)
        * afflu
        * profile.get("populationGrowthStress", 1)
    )
    reduced = generated * reduce_total
    stream = generated - reduced

    q_floor = scalars["recycleQualityFloor"]
    recycle_quality = q_floor + (1 - q_floor) * (city.get("education", 0) / 100)
    effective_recycle = city.get("recycleCap", 0)
    if city_has_flag(city, "INFORMAL_INTEGRATED"):
        effective_recycle *= 1 + profile.get("informalRecoveryBonus", 0) * 3
    recycled = min(effective_recycle, stream) * recycle_quality
    stream -= recycled

    incinerated = min(city.get("incinCap", 0), stream)
    stream -= incinerated
    ash = incinerated * wf.get("ashFraction", 0.2)

    want_landfill = stream + ash
    if city.get("forceUncollectedRound"):
        want_landfill += stream * 0.5
        stream = 0

    landfilled = min(city.get("landfillCap", 0), want_landfill)
    city["landfillCap"] = max(0, city.get("landfillCap", 0) - landfilled)
    uncollected = max(0, want_landfill - landfilled)
    leak = generated * max(0, 1 - profile.get("collectionServiceRate", 0.95))
    if city_has_flag(city, "INFORMAL_INTEGRATED"):
        leak *= 0.35
    if city_has_flag(city, "RECYCLING_SYSTEM"):
        leak *= 0.7
    uncollected += leak
    city["uncollectedCum"] = city.get("uncollectedCum", 0) + uncollected

    co2cfg = wf.get("co2", {})
    lf_factor = co2cfg.get("landfillCaptured", 0.12) if city.get("gasCapture") else co2cfg.get("landfill", 0.4)
    co2 = (
        incinerated * co2cfg.get("incinerate", 0.9)
        + landfilled * lf_factor
        + uncollected * co2cfg.get("uncollected", 0.6)
        + generated * co2cfg.get("transport", 0.05)
        - recycled * co2cfg.get("recycleCredit", 0.3)
    )
    if city.get("incinCap", 0) > 0:
        co2 -= incinerated * co2cfg.get("energyCredit", 0.2)
    co2 = max(0, co2)
    city["co2Cumulative"] = city.get("co2Cumulative", 0) + co2

    prices = game_config()["market"]["recyclablesPriceByRound"]
    r_price = (prices[round_num - 1] if round_num <= len(prices) else prices[-1]) * market_modifiers.get(
        "recyclablesPriceMultiplier", 1
    )
    e_prices = game_config()["market"]["energyPriceByRound"]
    e_price = (e_prices[round_num - 1] if round_num <= len(e_prices) else e_prices[-1]) * market_modifiers.get(
        "energyPriceMultiplier", 1
    )
    energy_mwh = incinerated * wf.get("energyMWhPerTonne", 600)
    recycle_income = recycled * r_price
    energy_income = (energy_mwh / 1000) * e_price * 10

    d_rate = (reduced + recycled) / generated if generated else 0
    runway = city["landfillCap"] / landfilled if landfilled else (99 if city["landfillCap"] > 0 else 0)
    c_intens = co2 / generated if generated else 0
    u_frac = uncollected / generated if generated else 0

    wms_cfg = wf.get("wms", {})
    wms = 100 * (
        wms_cfg.get("wDiv", 0.35) * d_rate
        + wms_cfg.get("wRunway", 0.25) * min(runway / wms_cfg.get("runwayTargetYrs", 4), 1)
        + wms_cfg.get("wCO2", 0.25) * max(0, 1 - c_intens / wms_cfg.get("co2IntensityCap", 0.8))
        + wms_cfg.get("wUncollected", 0.15) * (1 - min(u_frac, 1))
    )
    if u_frac > wf.get("uncollectedCrisisFraction", 0.25):
        wms *= wf.get("uncollectedCrisisMultiplier", 0.6)
    if city["landfillCap"] <= 0 and city.get("incinCap", 0) < stream + ash:
        wms *= wf.get("noRoomMultiplier", 0.7)
    wms = round(clamp(wms) * 10) / 10
    city["wms"] = wms

    flow = {
        "round": round_num,
        "generated": generated,
        "reduced": reduced,
        "recycled": recycled,
        "incinerated": incinerated,
        "landfilled": landfilled,
        "uncollected": uncollected,
        "co2": co2,
        "D": d_rate,
        "runway": runway,
        "cIntens": c_intens,
        "uFrac": u_frac,
        "wms": wms,
        "recycleIncome": recycle_income,
        "energyIncome": energy_income,
        "education": city.get("education"),
        "landfillCapRemaining": city["landfillCap"],
    }
    city["lastWasteFlow"] = flow
    city["wasteLoad"] = round(generated)
    city["forceUncollectedRound"] = False
    return flow


def apply_flow_to_pillars(city: dict, flow: dict, round_num: int, market_modifiers: dict | None = None) -> dict:
    wf = _wf()
    pmap = wf.get("pillarMap", {})
    economy_nudge = city["pillars"]["economy"]
    live_nudge = city["pillars"]["liveability"]

    city["pillars"]["capacity"] = clamp(100 * min(flow["runway"] / pmap.get("capacityFromRunwayYrs", 4), 1))
    city["pillars"]["circularity"] = clamp(100 * flow["D"])
    city["pillars"]["environment"] = clamp(
        100 * max(0, 1 - flow["cIntens"] / pmap.get("environmentCO2Cap", 0.8))
        - pmap.get("environmentUncollectedPenalty", 40) * min(flow["uFrac"], 1)
    )

    div = pmap.get("economyIncomeDivisor", 4)
    running = sum(
        cost
        for flag, cost in (game_config().get("budgetEconomyLink") or {}).get("infraRunningCost", {}).items()
        if city_has_flag(city, flag)
    )
    link = game_config().get("budgetEconomyLink") or {}
    dividend = 0
    if link.get("enabled") and city["pillars"]["economy"] >= link.get("minEconomyForDividend", 1):
        dividend = link.get("economyDividendPerRound", 0) * (city["pillars"]["economy"] / 100)

    budget_delta = round(dividend - running)
    if link.get("enabled") and link.get("wasteIncomeToBudget"):
        budget_delta += round((flow["recycleIncome"] + flow["energyIncome"]) / div)

    city["pillars"]["economy"] = clamp(
        economy_nudge + round(flow["recycleIncome"] / div + flow["energyIncome"] / div - running / 2)
    )
    city["pillars"]["liveability"] = clamp(
        live_nudge
        + pmap.get("liveabilityCollectionBonus", 8) * (1 - min(flow["uFrac"], 1))
        - pmap.get("liveabilityUncollectedPenalty", 10) * min(flow["uFrac"], 1)
    )
    city["budget"] += budget_delta
    return flow


def decay_education(city: dict) -> None:
    decay = _wf().get("eduDecayPerRound") or game_config().get("education", {}).get("decayPerRound", 2)
    city["education"] = clamp(city.get("education", 0) - decay)


def finalize_round_waste_flow(city: dict, round_num: int, market_modifiers: dict | None = None) -> dict | None:
    if not is_waste_flow_enabled():
        return None
    ensure_waste_flow_state(city)
    decay_education(city)
    flow = run_waste_flow(city, round_num, market_modifiers)
    apply_flow_to_pillars(city, flow, round_num, market_modifiers)
    return flow


def get_wms_grade_label(wms: float) -> str:
    grades = _wf().get("wms", {}).get("grades") or [
        {"min": 0, "label": "Failing"},
        {"min": 40, "label": "Struggling"},
        {"min": 60, "label": "Improving"},
        {"min": 80, "label": "Circular Leader"},
    ]
    label = grades[0]["label"]
    for g in grades:
        if wms >= g["min"]:
            label = g["label"]
    return label
