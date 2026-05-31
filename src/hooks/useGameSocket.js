import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

export function useGameSocket() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [city, setCity] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [worldEvent, setWorldEvent] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('roomUpdate', (data) => {
      setRoom(data);
      setLeaderboard(data.leaderboard || []);
    });

    socket.on('roundStart', (data) => {
      setScenario(data.scenario);
      if (data.worldEvent) setWorldEvent(data.worldEvent);
    });

    socket.on('worldEventTriggered', (event) => setWorldEvent(event));

    socket.on('gameEnd', (data) => {
      setLeaderboard(data.leaderboard);
      setReportCards(data.reportCards);
      setRoom((r) => (r ? { ...r, phase: 'reveal' } : r));
    });

    return () => socket.disconnect();
  }, []);

  const createRoom = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current.emit('createRoom', resolve);
    });
  }, []);

  const joinRoom = useCallback((code, studentName, archetype) => {
    return new Promise((resolve) => {
      socketRef.current.emit('joinRoom', { code, studentName, archetype }, (res) => {
        if (res.success) {
          setCity(res.city);
          setRoom(res.room);
        }
        resolve(res);
      });
    });
  }, []);

  const startGame = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current.emit('startGame', resolve);
    });
  }, []);

  const submitDecision = useCallback((cardIds, quizAnswer, decisionTime) => {
    return new Promise((resolve) => {
      socketRef.current.emit(
        'submitDecision',
        { cardIds, quizAnswer, decisionTime },
        (res) => {
          if (res.success) {
            setCity(res.city);
            setLastResult(res);
          }
          resolve(res);
        }
      );
    });
  }, []);

  const advanceRound = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current.emit('advanceRound', resolve);
    });
  }, []);

  const triggerWorldEvent = useCallback(() => {
    return new Promise((resolve) => {
      socketRef.current.emit('triggerWorldEvent', resolve);
    });
  }, []);

  return {
    connected,
    room,
    city,
    scenario,
    leaderboard,
    reportCards,
    worldEvent,
    lastResult,
    createRoom,
    joinRoom,
    startGame,
    submitDecision,
    advanceRound,
    triggerWorldEvent,
    socketId: socketRef.current?.id,
  };
}
