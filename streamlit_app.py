"""
Circular City — Streamlit deployment
Run locally: streamlit run streamlit_app.py
"""

from __future__ import annotations

import copy

import streamlit as st

from circular_city.engine import (
    apply_event_action,
    apply_growth,
    apply_world_event,
    advance_to_next_event,
    calculate_final_score,
    create_city,
    game_config,
    generate_report_card,
    get_current_event,
    market_modifiers_from_event,
    prepare_round_for_city,
    process_delayed_effects,
    resolve_event_justify,
    schedule_world_events,
)
from circular_city.events import world_event_market_modifiers

PILLAR_LABELS = {
    "environment": ("🌱", "Environment"),
    "economy": ("💰", "Economy"),
    "liveability": ("❤️", "Liveability"),
    "capacity": ("🗑️", "Capacity"),
    "circularity": ("♻️", "Circularity"),
}

EVENT_TYPE_LABELS = {
    "founding": "🏛️ Founding Charter",
    "round": "📋 City Event",
    "world": "⚡ World Event",
}


def init_session() -> None:
    defaults = {
        "game_started": False,
        "city": None,
        "current_round": 1,
        "round_world_events": {},
        "market_modifiers": {},
        "step": "setup",
        "last_result": None,
        "report_card": None,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def render_pillars(city: dict) -> None:
    cols = st.columns(5)
    for i, key in enumerate(["environment", "economy", "liveability", "capacity", "circularity"]):
        emoji, label = PILLAR_LABELS[key]
        val = city["pillars"][key]
        cols[i].metric(f"{emoji} {label}", f"{val:.0f}")


def render_sidebar(city: dict | None) -> None:
    st.sidebar.header("City status")
    if not city:
        st.sidebar.info("Start a new game to play.")
        return

    st.sidebar.metric("Budget", f"💰 {city['budget']}")
    st.sidebar.metric("Insight", f"💡 {city['insightPoints']}")
    st.sidebar.metric("Balance score", f"{city.get('balanceScore', 0):.1f}")
    if city.get("debt"):
        st.sidebar.metric("Debt", city["debt"])

    if city.get("flags"):
        with st.sidebar.expander("Consequence flags (your path)"):
            for f in city["flags"]:
                st.caption(f"• {f}")

    scheduled = st.session_state.get("round_world_events") or {}
    if scheduled:
        with st.sidebar.expander("World events this game (rounds 2–6)"):
            for r in range(2, 7):
                ev = scheduled.get(r)
                if ev:
                    st.markdown(f"**Year {r}:** {ev['name']}")


def page_setup() -> None:
    st.title("♻️ Circular City")
    st.markdown(
        """
        You are the **Chief Sustainability Officer** of a growing pixel city.
        Over **6 years**, navigate branching waste dilemmas — founding philosophy,
        flag-weighted random events, and world shocks — while balancing five pillars.

        *Streamlit edition: single-player per browser session. For live 19-player classrooms,
        use the React + Socket.io app (`npm run dev`).*
        """
    )

    cfg = game_config()
    col1, col2 = st.columns(2)
    with col1:
        name = st.text_input("Your name", value=st.session_state.get("player_name", "Mayor"))
    with col2:
        archetype = st.selectbox(
            "City archetype",
            options=["highIncome", "lowIncome"],
            format_func=lambda x: "High-income city" if x == "highIncome" else "Low / middle-income city",
        )

    st.caption(
        f"Insight bonus: +{cfg['insightBonusPerCorrect']} per correct justify · "
        f"cap {cfg['maxInsightBonus']}"
    )

    if st.button("Start new game", type="primary", use_container_width=True):
        st.session_state.player_name = name
        st.session_state.city = create_city("local", name or "Mayor", archetype)
        st.session_state.round_world_events = schedule_world_events()
        st.session_state.market_modifiers = {}
        st.session_state.current_round = 1
        st.session_state.game_started = True
        st.session_state.last_result = None
        st.session_state.report_card = None
        _begin_round()
        st.rerun()


def _begin_round() -> None:
    city = st.session_state.city
    rnd = st.session_state.current_round
    world = st.session_state.round_world_events.get(rnd) if rnd >= 2 else None
    prepare_round_for_city(city, rnd, world)
    city["growthAppliedThisRound"] = False
    st.session_state.step = "growth"


def page_game() -> None:
    city = st.session_state.city
    rnd = st.session_state.current_round
    step = st.session_state.step

    st.progress(rnd / 6, text=f"Year {rnd} of 6")
    render_pillars(city)

    if step == "growth":
        st.info("📈 **Growth tick** — population and affluence rise; waste pressure builds.")
        if st.button("Continue to events", type="primary"):
            if not city.get("growthAppliedThisRound"):
                apply_growth(city, rnd, city["archetype"])
                city["growthAppliedThisRound"] = True
            st.session_state.step = "decide"
            st.rerun()
        return

    event = get_current_event(city)
    if not event and step != "round_summary" and step != "finished":
        st.session_state.step = "round_summary"
        st.rerun()
        return

    if step == "round_summary":
        _page_round_summary(city, rnd)
        return

    if step == "finished":
        _page_finished(city)
        return

    idx = city.get("currentEventIndex", 0) + 1
    total = len(city.get("currentRoundEvents") or [])
    etype = event.get("eventType", "round")
    header = EVENT_TYPE_LABELS.get(etype, event.get("title", "Event"))

    st.subheader(f"{header} · Decision {idx}/{total}")
    if event.get("title") and etype != "founding":
        st.markdown(f"### {event['title']}")
    if event.get("theme"):
        st.caption(event["theme"])
    st.markdown(event.get("brief", ""))
    if event.get("caseFact"):
        st.info(f"📚 {event['caseFact']}")
    if etype == "world" and event.get("lectureHook"):
        st.warning(event["lectureHook"])

    if step == "decide":
        _page_decide(city, event, rnd)
    elif step == "quiz":
        _page_quiz(city, event)
    elif step == "result":
        _page_result(city, rnd)


def _page_decide(city: dict, event: dict, rnd: int) -> None:
    st.markdown("#### Choose your response")
    for action in event.get("actions") or []:
        cost = action.get("cost", 0)
        affordable = cost <= city["budget"]
        label = f"{action['label']} — 💰{cost}"
        if st.button(
            label,
            key=f"act_{event['id']}_{action['id']}",
            disabled=not affordable,
            use_container_width=True,
        ):
            st.session_state.pending_action = copy.deepcopy(action)
            justify = event.get("justify")
            if justify:
                st.session_state.step = "quiz"
            else:
                _resolve_decision(city, event, action, 0, rnd)
            st.rerun()

        if not affordable:
            st.caption("Insufficient budget")


def _page_quiz(city: dict, event: dict) -> None:
    justify = event["justify"]
    st.markdown("#### 💡 Justify your choice")
    st.markdown(justify["question"])
    for i, opt in enumerate(justify["options"]):
        if st.button(f"{chr(65 + i)}. {opt}", key=f"quiz_{event['id']}_{i}", use_container_width=True):
            action = st.session_state.pending_action
            _resolve_decision(city, event, action, i, st.session_state.current_round)
            st.rerun()


def _resolve_decision(city: dict, event: dict, action: dict, justify_index: int, rnd: int) -> None:
    if event.get("eventType") == "world":
        st.session_state.market_modifiers = {
            **market_modifiers_from_event(event),
            **world_event_market_modifiers(event),
        }
        apply_world_event(city, event, rnd)

    result = apply_event_action(
        city, action, rnd, st.session_state.market_modifiers
    )
    if not result.get("success"):
        st.error(result.get("error", "Could not apply action"))
        return

    justify_result = resolve_event_justify(city, event, justify_index)
    result["justifyCorrect"] = justify_result.get("correct")

    city["decisionsCount"] = city.get("decisionsCount", 0) + 1
    city["decisionLog"].append(
        {
            "round": rnd,
            "eventId": event["id"],
            "actionId": action["id"],
            "flags": list(city.get("flags") or []),
        }
    )

    advance_to_next_event(city)
    calculate_final_score(city)

    st.session_state.last_result = result
    st.session_state.step = "result"
    st.session_state.pending_action = None

    if city.get("roundComplete"):
        process_delayed_effects(city)
        calculate_final_score(city)


def _page_result(city: dict, rnd: int) -> None:
    result = st.session_state.last_result or {}
    st.success("✓ Decision resolved")
    if result.get("justifyCorrect"):
        st.markdown(f"**Insight +{game_config()['insightBonusPerCorrect']}** — correct justification!")
    elif result.get("justifyCorrect") is False:
        st.markdown("Incorrect justification — no insight bonus this time.")

    if result.get("resultExplain"):
        st.markdown(result["resultExplain"])

    effects = result.get("effects") or {}
    if effects:
        parts = [
            f"{'+' if v > 0 else ''}{v} {k}"
            for k, v in effects.items()
            if k in PILLAR_LABELS
        ]
        if parts:
            st.caption("Pillar changes: " + " · ".join(parts))

    if city.get("roundComplete"):
        st.session_state.step = "round_summary"
    else:
        st.session_state.step = "decide"

    if st.button("Continue", type="primary"):
        if st.session_state.step == "decide":
            # Next event — show growth only at round start (already applied)
            pass
        st.rerun()


def _page_round_summary(city: dict, rnd: int) -> None:
    st.success(f"Year {rnd} complete — all events resolved.")
    calculate_final_score(city)

    if rnd >= 6:
        city["rank"] = 1
        st.session_state.report_card = generate_report_card(city)
        st.session_state.step = "finished"
        st.rerun()
        return

    if st.button("Begin next year →", type="primary"):
        st.session_state.current_round = rnd + 1
        _begin_round()
        st.rerun()


def _page_finished(city: dict) -> None:
    st.balloons()
    st.title("🏆 Final Report Card")
    card = st.session_state.report_card or generate_report_card(city)

    col1, col2, col3 = st.columns(3)
    col1.metric("Final score", f"{card['finalScore']:.1f}")
    col2.metric("Balance", f"{card['balanceScore']:.1f}")
    col3.metric("Insight", card["insightPoints"])

    st.markdown(f"**{card['verdict']}**")
    st.markdown(f"- **Strength:** {card['biggestWin']}")
    st.markdown(f"- **Gap:** {card['biggestMistake']}")

    render_pillars(city)

    if card.get("flags"):
        st.markdown("**Your consequence path:** " + ", ".join(card["flags"]))

    if st.button("Play again"):
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()


def main() -> None:
    st.set_page_config(
        page_title="Circular City",
        page_icon="♻️",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    init_session()
    render_sidebar(st.session_state.city)

    if not st.session_state.game_started:
        page_setup()
    else:
        page_game()


if __name__ == "__main__":
    main()
