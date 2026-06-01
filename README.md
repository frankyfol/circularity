# Circular City

A competitive, pixel-art city-builder simulation for teaching urban waste management and sustainable development. Built for H2 Geography (9173) — Cluster 3: Sustainable Future and Climate Change.

## Overview

Each student is the **Chief Sustainability Officer** of their own growing pixel city. Over six rounds ("years"), students manage urban metabolism — consumption, waste disposal, and the shift from linear to circular city models.

**Core design principle:** Balance wins. There is no dominant strategy. Final scoring uses the geometric mean of five pillars (Environment, Economy, Liveability, Capacity, Circularity) plus Insight bonus from justify-quizzes.

## Features

- 6-round teacher-paced classroom session (~45–60 min)
- 19-player multiplayer with room codes (Socket.io)
- **Event campaign (v3):** founding charter + 60 branching round-events + 20 teacher world events
- **Consequence flags** weight and gate later events (linear vs circular storylines)
- Each round: growth tick → 4 sequential decisions (action → justify quiz → impact explanation)
- Teacher host screen with flag insight panel and per-round world events
- Two city archetypes (high-income vs low/middle-income)
- 16-bit pixel-art city canvas with animated actions
- Live leaderboard and final podium reveal
- Per-student City Report Cards

## Quick Start

### Streamlit (solo + teacher room, deployable)

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Open http://localhost:8501:

| Tab | Who | What |
|-----|-----|------|
| **Teacher host** | Projector / teacher laptop | Create room → share 5-letter code → Start game → Advance years |
| **Student join** | Each student device | Enter code + name → play (auto-syncs every ~2s) |
| **Solo practice** | Anyone | Full campaign offline |

**Local classroom (no setup):** Teacher + students use the same `streamlit run` URL in different browser tabs. Rooms use an in-memory store (works because one Python process serves all tabs).

**Streamlit Cloud (production classroom):** You need a shared store so every student hits the same room data:

1. Create a free [Upstash Redis](https://upstash.com) database
2. Copy **REST URL** and **REST TOKEN**
3. In Streamlit Cloud → your app → **Secrets**, add:
   ```toml
   UPSTASH_REDIS_REST_URL = "https://....upstash.io"
   UPSTASH_REDIS_REST_TOKEN = "AX..."
   ```
4. Deploy — main file: `streamlit_app.py`

**Deploy steps:** GitHub → [share.streamlit.io](https://share.streamlit.io) → New app → pick repo → `streamlit_app.py` → Deploy.

Round flow matches the Socket.io app: founding + 3 branched events per year; years 2–6 add a scheduled world event; teacher sees flags and “finished this year” counts before advancing.

### React multiplayer (classroom)

```bash
npm install
npm run dev
```

- **Student app:** http://localhost:5173
- **Game server:** http://localhost:3001

### Production (Node)

```bash
npm run build
npm start
```

Serves the built client and WebSocket server on port 3001.

## User manuals

- **[Teacher manual](docs/TEACHER_MANUAL.md)** — room setup, session plan, quiz tiers, pacing, troubleshooting  
- **[Student manual](docs/STUDENT_MANUAL.md)** — joining, playing each year, solo practice, tips  

## How to Play (Class Session)

1. **Teacher** creates a room, configures **quiz tier** and **events per year** (or use *Suggest balanced plan*), then shares the 5-letter code
2. **Students** join with name + city archetype on laptop or phone
3. Teacher clicks **Start Game** when the class is ready (session plan must be saved and valid)
4. Each year: growth tick → **founding charter** (Year 1 only, fixed for all) → 3 city events → justify quizzes → resolution
5. Years 2–6 add a **world event** as the 4th decision; teacher may re-roll it only before students reach that event
6. After Year 6: **Final Reveal** with rankings and report cards

## Tech Stack

- React 18 + Vite + Tailwind CSS
- HTML5 Canvas pixel city renderer
- Express + Socket.io multiplayer sync
- Client-side game engine (JSON config)

## Project Structure

```
streamlit_app.py      # Streamlit UI (deploy target for Streamlit Cloud)
circular_city/        # Python engine port (loads src/game/*.json)
requirements.txt      # Streamlit dependencies

src/
  game/
    engine.js       # Core mechanics, scoring, growth
    eventEngine.js  # Flag system, event selection, branching
    events.json     # 60 round-events + founding + 20 world events
    gameConfig.json # Growth curves, markets, legacy strategy cards
  components/       # UI screens and pixel canvas
  hooks/            # Socket.io client hook
server/
  index.js          # Multiplayer room server
```

## Learning Outcomes

The game exercises trade-offs across:

- Linear vs circular urban metabolism
- Waste hierarchy (reduce > reuse > recycle > incinerate > landfill)
- Environmental, economic, and social dimensions of sustainable urban development
- Real-world case studies: Semakau, Deonar, Copenhagen, Curitiba, Cairo zabbaleen, Denmark Polluter-Pays

## Regenerating event data

Mechanics + flags from `EVENT_DATABASE_SPEC.md`; plain-language scenes and choices from `content/CHOICE_LIBRARY.md`:

```bash
npm run build:content
npm run simulate:events
```

This runs `build-events-from-spec.js`, `merge-choice-library.js`, and `merge-quizzes.js` → updates `src/game/events.json` (including tiered `justifyTiers`).

## License

Educational use — H2 Geography course materials.
