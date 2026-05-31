# Circular City

A competitive, pixel-art city-builder simulation for teaching urban waste management and sustainable development. Built for H2 Geography (9173) — Cluster 3: Sustainable Future and Climate Change.

## Overview

Each student is the **Chief Sustainability Officer** of their own growing pixel city. Over six rounds ("years"), students manage urban metabolism — consumption, waste disposal, and the shift from linear to circular city models.

**Core design principle:** Balance wins. There is no dominant strategy. Final scoring uses the geometric mean of five pillars (Environment, Economy, Liveability, Capacity, Circularity) plus Insight bonus from justify-quizzes.

## Features

- 6-round teacher-paced classroom session (~45–60 min)
- 19-player multiplayer with room codes (Socket.io)
- Teacher host screen for round advancement and world events
- 14 waste-hierarchy strategy cards with escalating costs
- 5 world events (market crash, carbon tax, consumption surge, landfill fire, heatwave)
- Two city archetypes (high-income vs low/middle-income)
- 16-bit pixel-art city canvas with animated actions
- Live leaderboard and final podium reveal
- Per-student City Report Cards

## Quick Start

```bash
npm install
npm run dev
```

- **Student app:** http://localhost:5173
- **Game server:** http://localhost:3001

### Production

```bash
npm run build
npm start
```

Serves the built client and WebSocket server on port 3001.

## How to Play (Class Session)

1. **Teacher** opens the app → "Teacher Host" → share the 5-letter room code on the projector
2. **Students** join with name + city archetype on laptop or phone
3. Teacher clicks **Start Game** when all 19 have joined
4. Each round: growth tick → scenario → strategy choices → justify quiz → animated resolution → leaderboard flash
5. Teacher advances rounds; one random **World Event** hits mid-game
6. After Round 6: **Final Reveal** with rankings and printable Report Cards

## Tech Stack

- React 18 + Vite + Tailwind CSS
- HTML5 Canvas pixel city renderer
- Express + Socket.io multiplayer sync
- Client-side game engine (JSON config)

## Project Structure

```
src/
  game/
    engine.js       # Core mechanics, scoring, growth
    gameConfig.json # Scenarios, cards, events, markets
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

## License

Educational use — H2 Geography course materials.
