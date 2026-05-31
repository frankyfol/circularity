"""
Circular City — Streamlit (solo + teacher/student multiplayer)

Local:  streamlit run streamlit_app.py
Cloud:  set Upstash Redis secrets (see README) then deploy streamlit_app.py
"""

from __future__ import annotations

import copy
import uuid
from datetime import timedelta

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
    get_event_action_cost,
    market_modifiers_from_event,
    prepare_round_for_city,
    process_delayed_effects,
    resolve_event_justify,
    schedule_world_events,
)
from circular_city.events import world_event_market_modifiers
from circular_city.multiplayer import (
    advance_round,
    count_round_complete,
    create_host_room,
    get_leaderboard,
    join_room,
    load_room,
    reroll_world_event,
    start_game,
    sync_player_round,
    update_player_city,
)
from circular_city.room_store import get_room_store
from circular_city.shuffle_actions import shuffle_actions, shuffle_seed_for_event
from circular_city.year_summary import (
    display_label,
    event_narration,
    generate_year_summary,
    record_round_resolution,
)
from circular_city.engine import calculate_balance_score

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
    if "player_id" not in st.session_state:
        st.session_state.player_id = str(uuid.uuid4())
    defaults = {
        "mode": None,
        "room_code": None,
        "is_host": False,
        "game_started": False,
        "city": None,
        "current_round": 1,
        "round_world_events": {},
        "market_modifiers": {},
        "step": "setup",
        "last_result": None,
        "report_card": None,
        "room_sync_key": None,
        "room_version": 0,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def render_backend_banner() -> None:
    store = get_room_store()
    if store.backend_name() == "redis":
        st.success(
            "**Classroom multiplayer is ready** — shared rooms use your Upstash Redis database. "
            "Teacher and students can join the same room code from different devices."
        )
    else:
        st.warning(
            "**Local-only multiplayer** — rooms work in multiple tabs on one `streamlit run` "
            "session only. On Streamlit Cloud, add secrets `UPSTASH_REDIS_REST_URL` and "
            "`UPSTASH_REDIS_REST_TOKEN`, then **reboot the app**."
        )


def render_pillars(city: dict) -> None:
    cols = st.columns(5)
    keys = ["environment", "economy", "liveability", "capacity", "circularity"]
    for col, key in zip(cols, keys):
        emoji, label = PILLAR_LABELS[key]
        col.metric(f"{emoji} {label}", f"{city['pillars'][key]:.0f}")


def render_sidebar(city: dict | None, room: dict | None = None) -> None:
    st.sidebar.header("Status")
    backend = get_room_store().backend_name()
    st.sidebar.caption(
        "☁️ Redis connected" if backend == "redis" else "💻 Local memory store"
    )
    if room:
        st.sidebar.metric("Room", room["code"])
        st.sidebar.caption(f"Phase: **{room['phase']}** · Year **{room.get('currentRound', 0)}**/6")
    if not city:
        return
    st.sidebar.metric("Budget", f"💰 {city['budget']}")
    st.sidebar.metric("Insight", f"💡 {city['insightPoints']}")
    st.sidebar.metric("Balance", f"{city.get('balanceScore', 0):.1f}")
    if city.get("flags"):
        with st.sidebar.expander("Your flags"):
            for f in city["flags"]:
                st.caption(f)


def _persist_city() -> None:
    if st.session_state.mode == "multiplayer" and st.session_state.room_code:
        update_player_city(
            st.session_state.room_code,
            st.session_state.player_id,
            st.session_state.city,
        )


def _begin_round_local() -> None:
    city = st.session_state.city
    rnd = st.session_state.current_round
    events_map = st.session_state.round_world_events
    world = events_map.get(rnd) or events_map.get(str(rnd))
    prepare_round_for_city(city, rnd, world)
    city["growthAppliedThisRound"] = False
    city["roundResolutions"] = []
    st.session_state.step = "growth"


def poll_multiplayer_room() -> dict | None:
    code = st.session_state.room_code
    if not code:
        return None
    room = load_room(code)
    if not room:
        st.error("Room expired or not found.")
        return None

    st.session_state.room_version = room.get("version", 0)

    if st.session_state.is_host:
        st.session_state.room_snapshot = room
        return room

    city, sync_key, reset_ui = sync_player_round(
        room,
        st.session_state.player_id,
        st.session_state.room_sync_key,
    )
    if city:
        st.session_state.city = city
        st.session_state.current_round = room["currentRound"]
        st.session_state.round_world_events = room.get("roundWorldEvents", {})
        if reset_ui:
            st.session_state.room_sync_key = sync_key
            if room["phase"] == "playing":
                st.session_state.game_started = True
                st.session_state.step = "growth"
                st.session_state.last_result = None
            elif room["phase"] == "reveal":
                st.session_state.step = "finished"
                calculate_final_score(city)
                st.session_state.report_card = generate_report_card(city)

    st.session_state.room_snapshot = room
    return room


@st.fragment(run_every=timedelta(seconds=2))
def multiplayer_poll_fragment() -> None:
    if st.session_state.mode != "multiplayer" or not st.session_state.room_code:
        return
    prev_v = st.session_state.get("room_version", 0)
    room = poll_multiplayer_room()
    if room and room.get("version", 0) != prev_v and not st.session_state.is_host:
        st.rerun()


def page_home() -> None:
    st.title("♻️ Circular City")
    st.markdown(
        "Teach urban metabolism and the waste hierarchy — **solo practice**, "
        "**teacher host + student rooms**, or the full React multiplayer app."
    )
    render_backend_banner()

    tab_solo, tab_host, tab_join = st.tabs(["Solo practice", "Teacher host", "Student join"])

    with tab_solo:
        _page_solo_setup()
    with tab_host:
        _page_host_setup()
    with tab_join:
        _page_student_join()


def _page_solo_setup() -> None:
    cfg = game_config()
    name = st.text_input("Your name", value="Mayor", key="solo_name")
    archetype = st.selectbox(
        "Archetype",
        ["highIncome", "lowIncome"],
        format_func=lambda x: "High-income" if x == "highIncome" else "Low / middle-income",
        key="solo_arch",
    )
    if st.button("Start solo game", type="primary", key="solo_start"):
        st.session_state.mode = "solo"
        st.session_state.city = create_city("local", name, archetype)
        st.session_state.round_world_events = schedule_world_events()
        st.session_state.current_round = 1
        st.session_state.game_started = True
        st.session_state.market_modifiers = {}
        _begin_round_local()
        st.rerun()


def _page_host_setup() -> None:
    if st.session_state.room_code and st.session_state.is_host:
        _page_host_dashboard()
        return

    st.markdown("Create a room and share the **5-letter code** with your class.")
    if st.button("Create teacher room", type="primary"):
        room = create_host_room(st.session_state.player_id)
        st.session_state.mode = "multiplayer"
        st.session_state.is_host = True
        st.session_state.room_code = room["code"]
        st.session_state.game_started = False
        st.rerun()


def _page_host_dashboard() -> None:
    multiplayer_poll_fragment()
    room = st.session_state.get("room_snapshot") or load_room(st.session_state.room_code)
    if not room:
        st.error("Room not found")
        return

    st.markdown(f"## Room `{room['code']}`")
    st.code(room["code"], language=None)
    st.caption("Students: **Student join** tab → enter this code")

    leaderboard = get_leaderboard(room)
    done, total = count_round_complete(room)

    c1, c2, c3 = st.columns(3)
    c1.metric("Players", total)
    c2.metric("Year", f"{room['currentRound']}/6")
    c3.metric("Finished this year", f"{done}/{total}")

    if room["phase"] == "lobby":
        st.subheader("Lobby")
        if not leaderboard:
            st.info("Waiting for students to join…")
        else:
            for p in leaderboard:
                arch = "High-income" if p["archetype"] == "highIncome" else "Low-income"
                st.write(f"• **{p['studentName']}** ({arch})")
        if st.button("Start game", type="primary", disabled=total == 0):
            room, err = start_game(room["code"], st.session_state.player_id)
            if err:
                st.error(err)
            else:
                st.success("Game started — Year 1")
                st.rerun()

    elif room["phase"] == "playing":
        st.subheader(f"Year {room['currentRound']} in progress")
        we = room.get("roundWorldEvents", {}).get(str(room["currentRound"]))
        if we and room["currentRound"] >= 2:
            st.info(f"World event this year: **{we['name']}**")
            if st.button("Re-roll world event for this year"):
                reroll_world_event(room["code"], st.session_state.player_id, room["currentRound"])
                st.rerun()

        if leaderboard:
            st.dataframe(
                [
                    {
                        "Rank": p.get("rank", "—"),
                        "Name": p["studentName"],
                        "Score": p["score"],
                        "Done": "✓" if p.get("roundComplete") else "…",
                        "Flags": ", ".join((p.get("flags") or [])[:3]),
                    }
                    for p in sorted(leaderboard, key=lambda x: x.get("score", 0), reverse=True)
                ],
                use_container_width=True,
                hide_index=True,
            )

        with st.expander("Flag insight (teacher)"):
            for p in leaderboard:
                st.markdown(f"**{p['studentName']}:** {', '.join(p.get('flags') or []) or '—'}")

        if st.button("Advance to next year →", type="primary"):
            room, err = advance_round(room["code"], st.session_state.player_id)
            if err:
                st.error(err)
            else:
                st.rerun()

    elif room["phase"] == "reveal":
        st.success("Game complete")
        st.dataframe(
            [
                {
                    "Rank": p["rank"],
                    "Name": p["studentName"],
                    "Score": p["score"],
                    "Balance": p["balanceScore"],
                    "Insight": p["insightPoints"],
                }
                for p in get_leaderboard(room)
            ],
            use_container_width=True,
            hide_index=True,
        )
        if st.button("Close room"):
            st.session_state.room_code = None
            st.session_state.is_host = False
            st.session_state.mode = None
            st.rerun()


def _page_student_join() -> None:
    if st.session_state.mode == "multiplayer" and st.session_state.room_code and not st.session_state.is_host:
        multiplayer_poll_fragment()
        room = st.session_state.get("room_snapshot")
        if room and room["phase"] == "lobby":
            st.info(f"Joined room **{room['code']}** — waiting for teacher to start…")
            st.metric("Players in lobby", len(room.get("cities", {})))
            return
        if st.session_state.game_started:
            page_game(multiplayer=True)
            return

    code = st.text_input("Room code", max_chars=5, placeholder="ABCDE").strip().upper()
    name = st.text_input("Your name", key="join_name")
    archetype = st.selectbox(
        "City type",
        ["highIncome", "lowIncome"],
        format_func=lambda x: "High-income" if x == "highIncome" else "Low / middle-income",
        key="join_arch",
    )
    if st.button("Join room", type="primary"):
        if len(code) < 4:
            st.error("Enter the 5-letter room code from your teacher.")
            return
        room, err = join_room(code, st.session_state.player_id, name or "Student", archetype)
        if err:
            st.error(err)
            return
        st.session_state.mode = "multiplayer"
        st.session_state.room_code = code
        st.session_state.is_host = False
        st.session_state.city = room["cities"][st.session_state.player_id]
        if room["phase"] == "playing":
            st.session_state.game_started = True
            city, sk, _ = sync_player_round(room, st.session_state.player_id, None)
            if city:
                st.session_state.city = city
                st.session_state.current_round = room["currentRound"]
                st.session_state.room_sync_key = sk
                st.session_state.step = "growth"
        st.rerun()


def page_game(multiplayer: bool = False) -> None:
    if multiplayer:
        multiplayer_poll_fragment()
        room = st.session_state.get("room_snapshot")
        if room and room["phase"] == "reveal":
            st.session_state.step = "finished"
            city = st.session_state.city
            if city:
                calculate_final_score(city)
                ranked = get_leaderboard(room)
                for p in ranked:
                    if p["id"] == st.session_state.player_id:
                        city["rank"] = p["rank"]
                st.session_state.report_card = generate_report_card(city)

    city = st.session_state.city
    if not city:
        return

    rnd = st.session_state.current_round
    step = st.session_state.step
    room = st.session_state.get("room_snapshot") if multiplayer else None

    st.progress(rnd / 6, text=f"Year {rnd} of 6")
    if multiplayer and room:
        done, total = count_round_complete(room)
        st.caption(f"Class progress this year: {done}/{total} students finished")
    render_pillars(city)

    if step == "growth":
        st.info("📈 **Growth tick** — population and affluence rise.")
        if st.button("Continue to events", type="primary"):
            if not city.get("growthAppliedThisRound"):
                apply_growth(city, rnd, city["archetype"])
                city["growthAppliedThisRound"] = True
                _persist_city()
            st.session_state.step = "decide"
            st.rerun()
        return

    if step == "year_summary":
        _page_year_summary(city, rnd, multiplayer)
        return
    if step == "round_summary":
        _page_round_summary(city, rnd, multiplayer)
        return
    if step == "finished":
        _page_finished(city, multiplayer)
        return
    if step == "result":
        _page_result(city, rnd, multiplayer)
        return

    event = get_current_event(city)
    if not event:
        if city.get("roundComplete"):
            st.session_state.step = "year_summary"
            st.rerun()
            return
        if not (city.get("currentRoundEvents") or []):
            _begin_round_local()
            st.rerun()
            return
        st.warning("No active event — recovering your year.")
        st.session_state.step = "round_summary"
        st.rerun()
        return

    idx = city.get("currentEventIndex", 0) + 1
    total = len(city.get("currentRoundEvents") or [])
    etype = event.get("eventType", "round")
    header = EVENT_TYPE_LABELS.get(etype, event.get("title", "Event"))
    st.subheader(f"{header} · {idx}/{total}")
    if event.get("title") and etype != "founding":
        st.markdown(f"### {event['title']}")
    if event.get("theme"):
        st.caption(event["theme"])
    if event.get("conceptLink"):
        st.caption(event["conceptLink"])
    st.markdown(event_narration(event))
    if event.get("caseFact"):
        st.info(f"📚 {event['caseFact']}")
    if etype == "world" and event.get("lectureHook"):
        st.warning(event["lectureHook"])

    if step == "decide":
        _page_decide(city, event, rnd)
    elif step == "quiz":
        _page_quiz(city, event)
    else:
        st.session_state.step = "decide"
        st.rerun()


def _page_decide(city: dict, event: dict, rnd: int) -> None:
    mods = st.session_state.get("market_modifiers") or {}
    st.caption(
        f"City budget: **💰{city['budget']}** — you cannot afford every option. "
        "Trade-offs appear in your year summary after this round."
    )
    seed = shuffle_seed_for_event(event, city.get("id"), rnd)
    for item in shuffle_actions(event.get("actions") or [], seed):
        action = item["action"]
        letter = item["display_letter"]
        cost = get_event_action_cost(action, mods)
        affordable = cost <= city["budget"]
        label = display_label(action)
        meaning = action.get("plainMeaning") or action.get("meaning") or ""
        lines = [f"**{letter}. {label}** — 💰{cost}"]
        if meaning:
            lines.append(f"_{meaning}_")
        button_label = "\n\n".join(lines)
        with st.container(border=True):
            if st.button(
                button_label,
                key=f"act_{event['id']}_{action['id']}_{city.get('currentEventIndex')}",
                disabled=not affordable,
                use_container_width=True,
            ):
                st.session_state.pending_action = copy.deepcopy(action)
                st.session_state.step = "quiz" if event.get("justify") else "result"
                if not event.get("justify"):
                    _resolve_decision(city, event, action, 0, rnd)
                st.rerun()


def _page_quiz(city: dict, event: dict) -> None:
    justify = event["justify"]
    st.markdown(f"#### 💡 {justify['question']}")
    for i, opt in enumerate(justify["options"]):
        if st.button(f"{chr(65 + i)}. {opt}", key=f"q_{event['id']}_{i}", use_container_width=True):
            _resolve_decision(city, event, st.session_state.pending_action, i, st.session_state.current_round)
            st.rerun()


def _resolve_decision(city: dict, event: dict, action: dict, justify_index: int, rnd: int) -> None:
    if event.get("eventType") == "world":
        st.session_state.market_modifiers = {
            **market_modifiers_from_event(event),
            **world_event_market_modifiers(event),
        }
        apply_world_event(city, event, rnd)

    score_before = calculate_balance_score(city) + city.get("insightPoints", 0)
    result = apply_event_action(city, action, rnd, st.session_state.market_modifiers)
    if not result.get("success"):
        st.error(result.get("error", "Could not apply action"))
        return

    justify_result = resolve_event_justify(city, event, justify_index)
    record_round_resolution(city, event, action, result.get("effects") or {}, score_before)
    result["justifyCorrect"] = justify_result.get("correct")
    city["decisionsCount"] = city.get("decisionsCount", 0) + 1
    advance_to_next_event(city)
    calculate_final_score(city)

    if city.get("roundComplete"):
        process_delayed_effects(city)
        calculate_final_score(city)

    st.session_state.last_result = result
    st.session_state.step = "result"
    _persist_city()


def _page_result(city: dict, rnd: int, multiplayer: bool) -> None:
    result = st.session_state.last_result or {}
    st.success("✓ Decision resolved")
    if result.get("justifyCorrect"):
        st.markdown(f"**Insight +{game_config()['insightBonusPerCorrect']}**")
    if result.get("resultExplain"):
        st.markdown(result["resultExplain"])
    if city.get("roundComplete"):
        if st.button("View year in review →", type="primary"):
            st.session_state.step = "year_summary"
            _persist_city()
            st.rerun()
        return
    st.session_state.step = "decide"
    if st.button("Continue", type="primary"):
        st.rerun()


def _page_year_summary(city: dict, rnd: int, multiplayer: bool) -> None:
    st.subheader(f"Year {rnd} in review")
    summary = generate_year_summary(city, rnd)
    st.markdown(f"**{summary['cityName']}** — population {summary['population']:,}, waste load {summary['wasteLoad']:,}")
    st.caption(
        "Here is what your choices meant — the good and the tricky parts. "
        "Circular options are not always the best fit; every path has trade-offs."
    )
    for entry in summary["entries"]:
        st.markdown(f"**{entry['title']}** — \"{entry['plainLabel']}\"")
        if entry.get("plainMeaning"):
            st.caption(entry["plainMeaning"])
        for pro in entry.get("pros") or []:
            st.markdown(f"✓ {pro}")
        for con in entry.get("cons") or []:
            st.markdown(f"△ {con}")
        if entry.get("netEffect"):
            st.caption(f"📊 {entry['netEffect']}")
    st.markdown(f"**Score change:** {summary['scoreChange']:+}")
    st.markdown(summary["verdict"])
    if summary.get("balanceLesson"):
        st.markdown(f"**Remember:** {summary['balanceLesson']}")
    if summary.get("consequenceWatch"):
        st.info(f"**Consequence watch:** {summary['consequenceWatch']}")
    if st.button("Continue", type="primary"):
        st.session_state.step = "round_summary"
        st.rerun()


def _page_round_summary(city: dict, rnd: int, multiplayer: bool) -> None:
    st.success(f"Year {rnd} complete!")
    calculate_final_score(city)
    _persist_city()

    if rnd >= 6:
        if multiplayer:
            st.info("Waiting for other students and final rankings from your teacher…")
            room = load_room(st.session_state.room_code)
            if room and room["phase"] == "reveal":
                st.session_state.step = "finished"
                st.rerun()
        else:
            city["rank"] = 1
            st.session_state.report_card = generate_report_card(city)
            st.session_state.step = "finished"
            st.rerun()
        return

    if multiplayer:
        st.info("Waiting for the teacher to advance to the next year…")
        return

    if st.button("Begin next year →", type="primary"):
        st.session_state.current_round = rnd + 1
        _begin_round_local()
        st.rerun()


def _page_finished(city: dict, multiplayer: bool) -> None:
    st.title("🏆 Final Report Card")
    room = load_room(st.session_state.room_code) if multiplayer else None
    if multiplayer and room:
        for p in get_leaderboard(room):
            if p["id"] == st.session_state.player_id:
                city["rank"] = p["rank"]
    card = st.session_state.report_card or generate_report_card(city)
    col1, col2, col3 = st.columns(3)
    col1.metric("Final score", f"{card['finalScore']:.1f}")
    col2.metric("Balance", f"{card['balanceScore']:.1f}")
    col3.metric("Rank", card.get("rank", "—"))
    st.markdown(f"**{card['verdict']}**")
    st.markdown(f"- {card['biggestWin']}")
    st.markdown(f"- {card['biggestMistake']}")
    render_pillars(city)
    if multiplayer and room:
        st.subheader("Class leaderboard")
        st.dataframe(
            [
                {"Rank": p["rank"], "Name": p["studentName"], "Score": p["score"]}
                for p in get_leaderboard(room)
            ],
            hide_index=True,
            use_container_width=True,
        )
    if st.button("Play again"):
        for k in list(st.session_state.keys()):
            del st.session_state[k]
        st.rerun()


def main() -> None:
    st.set_page_config(page_title="Circular City", page_icon="♻️", layout="wide")
    init_session()
    render_sidebar(st.session_state.city, st.session_state.get("room_snapshot"))

    if st.session_state.mode == "solo" and st.session_state.game_started:
        page_game(multiplayer=False)
    elif st.session_state.mode == "multiplayer" and st.session_state.is_host:
        _page_host_dashboard()
    elif st.session_state.mode == "multiplayer" and st.session_state.game_started:
        page_game(multiplayer=True)
    else:
        page_home()


if __name__ == "__main__":
    main()
