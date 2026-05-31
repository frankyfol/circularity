import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCity,
  applyGrowth,
  applyStrategyCard,
  applyWorldEvent,
  recordQuizAnswer,
  processDelayedEffects,
  applyStatusQuoDecay,
  calculateFinalScore,
  rankCities,
  generateReportCard,
  pickRandomWorldEvent,
  getScenario,
} from '../src/game/engine.js';

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
    worldEvent: null,
    worldEventRound: null,
    marketModifiers: {},
    cities: new Map(),
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
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
  }));
}

function broadcastRoom(room) {
  io.to(room.code).emit('roomUpdate', {
    code: room.code,
    phase: room.phase,
    currentRound: room.currentRound,
    worldEvent: room.worldEvent,
    worldEventRound: room.worldEventRound,
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

    cb({
      success: true,
      city: room.cities.get(cityId),
      room: {
        code: room.code,
        phase: room.phase,
        currentRound: room.currentRound,
      },
    });
    broadcastRoom(room);
  });

  socket.on('startGame', (cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return cb?.({ success: false });
    room.phase = 'playing';
    room.currentRound = 1;
    room.worldEventRound = 3 + Math.floor(Math.random() * 2);
    room.worldEvent = pickRandomWorldEvent();
    broadcastRoom(room);
    io.to(room.code).emit('roundStart', {
      round: 1,
      scenario: getScenario(1),
    });
    cb?.({ success: true });
  });

  socket.on('submitDecision', ({ cardIds, quizAnswer, decisionTime }, cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room) return cb?.({ success: false });
    const city = room.cities.get(socket.cityId);
    if (!city) return cb?.({ success: false });

    const round = room.currentRound;
    applyGrowth(city, round, city.archetype);

    if (round === room.worldEventRound && room.worldEvent) {
      applyWorldEvent(city, room.worldEvent, round);
    }

    const results = [];
    for (const cardId of cardIds.slice(0, 3)) {
      const result = applyStrategyCard(city, cardId, round, room.marketModifiers);
      if (result.success) results.push(result);
    }

    if (results.length === 0) {
      applyStatusQuoDecay(city);
    }

    processDelayedEffects(city);

    const scenario = getScenario(round);
    if (scenario?.quiz) {
      const correct = quizAnswer === scenario.quiz.correctIndex;
      recordQuizAnswer(city, correct);
    }

    city.decisionsCount += 1;
    city.totalDecisionTime += decisionTime || 0;
    city.decisionLog.push({
      round,
      cardIds,
      results: results.map((r) => r.card?.id),
      pillars: { ...city.pillars },
    });

    calculateFinalScore(city);
    room.cities.set(socket.cityId, city);

    cb?.({
      success: true,
      city,
      results,
      animations: results.map((r) => r.animationId).filter(Boolean),
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
    broadcastRoom(room);
    io.to(room.code).emit('roundStart', {
      round: room.currentRound,
      scenario: getScenario(room.currentRound),
      worldEvent:
        room.currentRound === room.worldEventRound ? room.worldEvent : null,
    });
    cb?.({ success: true });
  });

  socket.on('triggerWorldEvent', (cb) => {
    const room = rooms.get(socket.roomCode);
    if (!room || room.hostId !== socket.id) return cb?.({ success: false });
    room.worldEvent = pickRandomWorldEvent();
    room.worldEventRound = room.currentRound;
    io.to(room.code).emit('worldEventTriggered', room.worldEvent);
    broadcastRoom(room);
    cb?.({ success: true, event: room.worldEvent });
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
