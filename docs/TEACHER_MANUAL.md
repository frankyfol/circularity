# Circular City — Teacher Manual

Guide for running **Circular City** in the classroom (H2 Geography — urban metabolism and the waste hierarchy).

---

## What you are running

**Circular City** is a 6-year simulation. Each student is the Chief Sustainability Officer of a pixel city. They balance five pillars:

| Pillar | Focus |
|--------|--------|
| Environment | Pollution, GHG, environmental harm |
| Economy | Budget, markets, debt |
| Liveability | Health, trust, NIMBY |
| Capacity | Landfill and disposal headroom |
| Circularity | Reduce, reuse, recycle integration |

Students also earn **Insight** from short quizzes after most decisions. **Balance wins** — there is no single dominant strategy. Final score combines pillar balance (geometric mean) plus Insight (capped at 60).

---

## Which app to use

| Option | Best for | Solo practice |
|--------|----------|----------------|
| **Streamlit** (`streamlit run streamlit_app.py` or Streamlit Cloud) | School deployment, phones/laptops, one URL | Yes — **Solo practice** tab |
| **React + Node** (`npm run dev`) | IT lab with local server; projector host screen | No — classroom only |

**Recommended for most classes:** Streamlit.

---

## Before class (about 15 minutes)

1. **Test the URL** on your laptop and one student device.
2. **Streamlit Cloud:** Add Upstash Redis secrets (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) and **reboot** the app so students on different devices share the same room.
3. **Plan pedagogy:**
   - **Quiz tier** for the class: Easy (+2), Standard (+4), or Hard (+6) insight per correct answer.
   - **Events per year** — pick yourself or use **Suggest balanced event plan**.
4. **Timing:** Allow ~45–60 minutes for six years. You control when each year ends.

---

## Streamlit classroom — step by step

### 1. Create the room

1. Open the app → tab **Teacher host**.
2. Click **Create teacher room**.
3. Display the **5-letter room code** on the projector.

### 2. Configure the session (lobby only)

Open **Configure session (events & quiz tier)**:

| Setting | What to do |
|---------|------------|
| **Quiz tier released to class** | Easy, Standard, or Hard — applies to every student. |
| **Year 1** | **Founding charter** is automatic (same for everyone). Pick **3 city events** (in addition to the charter). |
| **Years 2–6** | Pick **3 city events** and **1 world event** per year. |
| **Suggest balanced event plan** | Fills all years with a balanced mix and **saves** to the room. |
| **Save session plan** | Required after you edit events or tier manually. |

The game **will not start** until every year is valid (exactly 3 city events per year; world events on years 2–6 only).

### 3. Students join

Students use **Student join** → room code → name → city archetype (high-income or low/middle-income).

Wait until the lobby lists all players.

### 4. Start Year 1

Click **Start game**. Students see a growth tick, then events one at a time.

### 5. During each year

- Watch **Finished this year** (e.g. 18/19).
- Optional: **Flag insight (teacher)** — see each student’s storyline flags for class discussion.
- Optional: **Re-roll world event for this year** — only use if students have **not** yet reached the world event in that year (see [Known limitations](#known-limitations)).

### 6. Advance the class

When most students have finished all events in the year, click **Advance to next year →**. Repeat for years 2–6.

### 7. End of game

After Year 6, the room shows final rankings. Use report cards for debrief.

---

## React host — step by step

If you use `npm run dev` (client + server on your network):

1. Choose **Teacher Host** → share the room code.
2. In the lobby, open **Session setup**:
   - Set **quiz tier**
   - Expand each year → select 3 city events → choose world event (years 2–6)
   - **Suggest balanced plan** → **Save session plan**
3. **Start Game** when students have joined.
4. **Advance Round →** between years.
5. **Re-roll World Event** only when appropriate (same mid-year caveat as Streamlit).

---

## What happens each year (student view)

| Year | Events (typical order) |
|------|-------------------------|
| **1** | Founding charter (fixed) → 3 city events |
| **2–6** | 3 city events → 1 world event |

Per event: scenario → choose action → insight quiz (your released tier) → result → at year end, **Year in review**.

---

## Quiz tiers (classroom)

You choose **one tier** for the whole room before start:

| Tier | Insight per correct answer |
|------|----------------------------|
| Easy | +2 |
| Standard | +4 |
| Hard | +6 |

Students do **not** pick difficulty in classroom mode. Use Easy for introductory lessons; Hard when content was pre-taught.

---

## Session events (classroom vs solo)

| Mode | Who picks events | Founding charter (Year 1) |
|------|------------------|---------------------------|
| **Classroom** | You — 3 city events/year + world events years 2–6 | Fixed for everyone |
| **Solo practice** (student homework) | Random each year | Fixed for everyone |

Curated events are **not** filtered by each student’s earlier flags — you may pick events that fit your lesson even if some students’ storylines differ.

---

## Teaching tips

- **Year 1 charter** — same opening for all; compare paths after founding choices.
- **Pause after Year in review** — pair discussion before you advance.
- **Curate world events** to match case studies (landfill fires, commodity prices, regional shocks).
- **Flag insight** — useful for “why did your city get this event?” without revealing answers during play.
- **Solo tab** — send students to practice at home with random events and self-chosen quiz tier.

---

## Known limitations

- **Save before start** — Unsaved session edits are not used when you click Start game.
- **Re-roll mid-year** — Updates the room plan but not students who already have that year’s event queue built. Re-roll only before students reach the world event.
- **Late joiners** — Synced to the current year with the room’s session plan.
- **Streamlit local memory** — Multiple tabs on **one** `streamlit run` share rooms; different devices need Redis on Cloud.
- **Insight cap** — Total insight cannot exceed 60.

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| “Year X needs exactly 3 events” | Open session setup, pick 3 events for that year, **Save session plan**. |
| Students cannot find room | Verify code; on Cloud, check Redis secrets and reboot. |
| Start game disabled | Need at least one student + valid saved session plan. |
| Student on wrong year | Ask them to refresh; only **you** advance the class year. |
| Re-roll had no effect | Students already passed that world event — plan re-rolls before they get there. |
| “Only the teacher can…” | Student opened Teacher host by mistake — use Student join. |

---

## Technical reference

- Regenerate event/quiz content: `npm run build:content`
- Verify engine: `npm run simulate:events`
- Main config: `src/game/gameConfig.json`
- Quiz banks: `content/quizzes.json` (merged into `src/game/events.json`)

For setup and deployment, see the root [README.md](../README.md).

Student instructions: [STUDENT_MANUAL.md](./STUDENT_MANUAL.md).
