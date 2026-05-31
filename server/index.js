import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCity,
  applyGrowth,
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
  pickRandomWorldEvent,
  marketModifiersFromEvent,
  worldEventMarketModifiers,
  calculateBalanceScore,
} from '../src/game/engine.js';
import { recordRoundResolution } from '../src/game/yearSummary.js';

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
    cities: new Map(),
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getWorldEventForRound(room, round) {
  if (round < 2) return null;
  if (!room.roundWorldEvents[round]) {
    room.roundWorldEvents[round] = pickRandomWorldEvent(
      Object.values(room.roundWorldEvents).map((e) => e.id)
    );
  }
  return room.roundWorldEvents[round];
}

function startRoundForCity(city, room, round) {
  city.growthAppliedThisRound = false;
  city.roundComplete = false;
  city.roundResolutions = [];
  const worldEvent = getWorldEventForRound(room, round);
  const queue = prepareRoundForCity(city, round, worldEvent);
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

  socket.on('startGame', (cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return cb?.({ success: false });
    room.phase = 'playing';
    room.currentRound = 1;
    room.roundWorldEvents = {};
    room.marketModifiers = {};

    for (let r = 2; r <= 6; r++) {
      getWorldEventForRound(room, r);
    }

    for (const [cityId, city] of room.cities) {
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

    const result = applyEventAction(city, action, round, room.marketModifiers);
    if (!result.success) return cb?.({ success: false, error: result.error });

    const justifyResult = resolveEventJustify(city, event, justifyAnswer);
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

    const event = pickRandomWorldEvent(
      Object.values(room.roundWorldEvents).map((e) => e.id)
    );
    room.roundWorldEvents[targetRound] = event;
    applyEventMarketModifiers(room, event);
    io.to(room.code).emit('worldEventScheduled', { round: targetRound, event });
    broadcastRoom(room);
    cb?.({ success: true, event, round: targetRound });
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
