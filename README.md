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

### Streamlit (single-player, easiest deploy)

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Open http://localhost:8501 — full branching event campaign in the browser.

**Deploy to [Streamlit Community Cloud](https://streamlit.io/cloud):**

1. Push this repo to GitHub
2. New app → select the repo
3. Main file path: `streamlit_app.py`
4. Deploy (uses `requirements.txt` automatically)

Each student opens the deployed URL in their own browser tab (separate game session). For live 19-player sync, use the React multiplayer stack below.

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

## How to Play (Class Session)

1. **Teacher** opens the app → "Teacher Host" → share the 5-letter room code on the projector
2. **Students** join with name + city archetype on laptop or phone
3. Teacher clicks **Start Game** when all 19 have joined
4. Each round: growth tick → **founding event** (Round 1 only) → 3 flag-weighted random events → justify quizzes → resolution
5. Rounds 2–6 add a **World Event** as the 4th decision; teacher can re-roll it from the host screen
6. After Round 6: **Final Reveal** with rankings and printable Report Cards

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

Event content is generated from `EVENT_DATABASE_SPEC.md`:

```bash
npm run build:events
npm run simulate:events
```

## License

Educational use — H2 Geography course materials.
