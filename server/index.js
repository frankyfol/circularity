import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCity,
  applyGrowth,
  finalizeRoundWasteFlow,
  applyEventAction,
  applyWorldEventFlatAndConditionals,
  resolveEventJustify,
  advanceToNextEvent,
  getCurrentEvent,
  prepareRoundForCity,
  processDelayedEffects,
  calculateFinalScore,
  rankCities,
  generateReportCard,
  marketModifiersFromEvent,
  worldEventMarketModifiers,
  calculateBalanceScore,
} from '../src/game/engine.js';
import { recordRoundResolution } from '../src/game/yearSummary.js';
import {
  createTeacherSessionConfig,
  validateSessionPlan,
  listRoundEventCatalog,
  listWorldEventCatalog,
  buildSuggestedCuratedPlan,
  getEventByIdFromCatalog,
} from '../src/game/sessionPlan.js';

function applyEventMarketModifiers(room, event) {
  room.marketModifiers = {
    ...marketModifiersFromEvent(event),
    ...worldEventMarketModifiers(event),
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(hostId) {
  const code = generateRoomCode();
  const room = {
    code,
    hostId,
    phase: 'lobby',
    currentRound: 0,
    roundWorldEvents: {},
    marketModifiers: {},
    sessionConfig: createTeacherSessionConfig(),
    cities: new Map(),
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function worldEventsSnapshot(room) {
  const cfg = room.sessionConfig || {};
  const out = {};
  if (cfg.mode === 'curated') {
    for (let r = 2; r <= 6; r++) {
      const wid = cfg.rounds?.[String(r)]?.worldEventId;
      if (wid) {
        const ev = getEventByIdFromCatalog(wid);
        if (ev) out[r] = ev;
      }
    }
    return out;
  }
  return out;
}

function getWorldEventForRound(room, round) {
  if (round < 2) return null;
  const key = String(round);
  return room.roundWorldEvents[key] ?? room.roundWorldEvents[round] ?? null;
}

function startRoundForCity(city, room, round) {
  city.growthAppliedThisRound = false;
  city.roundComplete = false;
  city.roundResolutions = [];
  const cfg = room.sessionConfig || city.sessionConfig;
  if (cfg && !city.sessionConfig) city.sessionConfig = { ...cfg };
  const queue = prepareRoundForCity(city, round, cfg);
  const worldEvent = getWorldEventForRound(room, round);
  return { queue, worldEvent };
}

function emitRoundStartToPlayer(socket, room, city) {
  const round = room.currentRound;
  const { queue, worldEvent } = startRoundForCity(city, room, round);
  room.cities.set(city.id, city);

  socket.emit('roundStart', {
    round,
    events: queue,
    currentEventIndex: 0,
    currentEvent: queue[0] ?? null,
    worldEvent: round >= 2 ? worldEvent : null,
    totalEvents: queue.length,
  });
}

function getLeaderboard(room) {
  const cities = Array.from(room.cities.values());
  const ranked = rankCities(cities);
  return ranked.map((c) => ({
    id: c.id,
    studentName: c.studentName,
    archetype: c.archetype,
    score: c.score,
    balanceScore: c.balanceScore,
    insightPoints: c.insightPoints,
    pillars: { ...c.pillars },
    rank: c.rank,
    roundComplete: c.roundComplete,
    flags: [...(c.flags || [])],
  }));
}

function broadcastRoom(room) {
  io.to(room.code).emit('roomUpdate', {
    code: room.code,
    phase: room.phase,
    currentRound: room.currentRound,
    roundWorldEvents: room.roundWorldEvents,
    marketModifiers: room.marketModifiers,
    sessionConfig: room.sessionConfig,
    playerCount: room.cities.size,
    leaderboard: getLeaderboard(room),
  });
}

io.on('connection', (socket) => {
  socket.on('createRoom', (cb) => {
    const room = createRoom(socket.id);
    socket.join(room.code);
    socket.roomCode = room.code;
    socket.isHost = true;
    cb({ success: true, code: room.code });
    broadcastRoom(room);
  });

  socket.on('joinRoom', ({ code, studentName, archetype }, cb) => {
    const room = rooms.get(code?.toUpperCase());
    if (!room) return cb({ success: false, error: 'Room not found' });
    if (room.phase !== 'lobby' && room.phase !== 'playing')
      return cb({ success: false, error: 'Game already in progress or finished' });

    const cityId = socket.id;
    if (!room.cities.has(cityId)) {
      room.cities.set(cityId, createCity(cityId, studentName, archetype));
    }

    socket.join(room.code);
    socket.roomCode = room.code;
    socket.cityId = cityId;

    const city = room.cities.get(cityId);

    cb({
      success: true,
      city,
      room: {
        code: room.code,
        phase: room.phase,
        currentRound: room.currentRound,
      },
    });
    broadcastRoom(room);

    if (room.phase === 'playing' && room.currentRound > 0) {
      emitRoundStartToPlayer(socket, room, city);
    }
  });

  socket.on('updateSessionConfig', (sessionConfig, cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) {
      return cb?.({ success: false, error: 'Not authorized' });
    }
    if (room.phase !== 'lobby') {
      return cb?.({ success: false, error: 'Session can only be edited before start' });
    }
    const errors = validateSessionPlan(sessionConfig);
    if (errors.length) {
      return cb?.({ success: false, error: errors.join('; ') });
    }
    room.sessionConfig = sessionConfig;
    broadcastRoom(room);
    cb?.({ success: true, sessionConfig: room.sessionConfig });
  });

  socket.on('getSessionCatalog', (cb) => {
    const catalog = {};
    for (let r = 1; r <= 6; r++) {
      catalog[r] = listRoundEventCatalog(r);
    }
    cb?.({
      success: true,
      roundEvents: catalog,
      worldEvents: listWorldEventCatalog(),
      suggestedPlan: buildSuggestedCuratedPlan(),
      quizTiers: ['easy', 'standard', 'hard'],
    });
  });

  socket.on('startGame', (cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return cb?.({ success: false });
    const errors = validateSessionPlan(room.sessionConfig);
    if (errors.length) {
      return cb?.({ success: false, error: errors.join('; ') });
    }
    room.phase = 'playing';
    room.currentRound = 1;
    room.marketModifiers = {};
    room.roundWorldEvents = worldEventsSnapshot(room);

    for (const [cityId, city] of room.cities) {
      city.sessionConfig = { ...room.sessionConfig };
      const playerSocket = io.sockets.sockets.get(cityId);
      if (playerSocket) emitRoundStartToPlayer(playerSocket, room, city);
    }

    broadcastRoom(room);
    cb?.({ success: true });
  });

  socket.on('submitEventDecision', ({ actionId, justifyAnswer, decisionTime }, cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return cb?.({ success: false });
    const city = room.cities.get(socket.cityId);
    if (!city) return cb?.({ success: false });

    const round = room.currentRound;
    const event = getCurrentEvent(city);
    if (!event) return cb?.({ success: false, error: 'No active event' });

    if (!city.growthAppliedThisRound) {
      applyGrowth(city, round, city.archetype);
      city.growthAppliedThisRound = true;
    }

    const action = event.actions?.find((a) => a.id === actionId);
    if (!action) return cb?.({ success: false, error: 'Invalid action' });

    if (event.eventType === 'world') {
      applyEventMarketModifiers(room, event);
      applyWorldEventFlatAndConditionals(city, event, round);
    }

    const scoreBefore = calculateBalanceScore(city) + city.insightPoints;

    const result = applyEventAction(city, action, round, room.marketModifiers, event);
    if (!result.success) return cb?.({ success: false, error: result.error });

    const justifyResult = resolveEventJustify(city, event, justifyAnswer, {
      cityId: socket.cityId,
      round,
    });
    recordRoundResolution(city, event, action, result.effects, scoreBefore);

    city.decisionsCount += 1;
    city.totalDecisionTime += decisionTime || 0;
    city.decisionLog.push({
      round,
      eventId: event.id,
      eventType: event.eventType,
      actionId: action.id,
      flags: [...city.flags],
      pillars: { ...city.pillars },
    });

    advanceToNextEvent(city);

    if (city.roundComplete) {
      processDelayedEffects(city);
      finalizeRoundWasteFlow(city, round, room.marketModifiers);
    }

    calculateFinalScore(city);
    room.cities.set(socket.cityId, city);

    const nextEvent = getCurrentEvent(city);

    cb?.({
      success: true,
      city,
      result: {
        ...result,
        justifyCorrect: justifyResult.correct,
        justifyExplanation: justifyResult.explanation,
        insightBonus: justifyResult.insightBonus,
      },
      roundComplete: city.roundComplete,
      nextEvent,
      currentEventIndex: city.currentEventIndex,
    });
    broadcastRoom(room);
  });

  socket.on('advanceRound', (cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return cb?.({ success: false });

    if (room.currentRound >= 6) {
      room.phase = 'reveal';
      const ranked = rankCities(Array.from(room.cities.values()));
      const reportCards = ranked.map((c) => generateReportCard(c));
      io.to(room.code).emit('gameEnd', {
        leaderboard: getLeaderboard(room),
        reportCards,
      });
      broadcastRoom(room);
      return cb?.({ success: true, finished: true });
    }

    room.currentRound += 1;
    room.marketModifiers = {};

    for (const [cityId, city] of room.cities) {
      const playerSocket = io.sockets.sockets.get(cityId);
      if (playerSocket) emitRoundStartToPlayer(playerSocket, room, city);
    }

    broadcastRoom(room);
    cb?.({ success: true, round: room.currentRound });
  });

  socket.on('triggerWorldEvent', ({ round }, cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return cb?.({ success: false });
    const targetRound = round ?? room.currentRound;
    if (targetRound < 2) return cb?.({ success: false, error: 'World events start round 2' });

    const cfg = room.sessionConfig || {};
    if (cfg.mode === 'curated') {
      const worlds = listWorldEventCatalog();
      const used = Object.entries(cfg.rounds || {})
        .filter(([k]) => String(k) !== String(targetRound))
        .map(([, p]) => p.worldEventId)
        .filter(Boolean);
      const pool = worlds.filter((w) => !used.includes(w.id));
      const pick = (pool.length ? pool : worlds)[Math.floor(Math.random() * (pool.length || worlds.length))];
      if (pick) {
        cfg.rounds = cfg.rounds || {};
        cfg.rounds[String(targetRound)] = {
          ...cfg.rounds[String(targetRound)],
          worldEventId: pick.id,
        };
        room.roundWorldEvents = worldEventsSnapshot(room);
        const event = getEventByIdFromCatalog(pick.id);
        applyEventMarketModifiers(room, event);
        io.to(room.code).emit('worldEventScheduled', { round: targetRound, event });
      }
    } else {
      return cb?.({ success: false, error: 'Use session setup for curated world events' });
    }
    broadcastRoom(room);
    cb?.({ success: true, round: targetRound });
  });

  socket.on('getCity', (cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return cb?.({ success: false });
    const city = room.cities.get(socket.cityId);
    cb?.({ success: true, city });
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomCode);
    if (room && room.hostId === socket.id && room.phase === 'lobby') {
      rooms.delete(room.code);
    }
  });
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) res.status(404).send('Build the client first with npm run build');
  });
});

httpServer.listen(PORT, () => {
  console.log(`Circular City server on port ${PORT}`);
});
