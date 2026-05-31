import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

export function useGameSocket() {
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [city, setCity] = useState(null);
  const [roundEvents, setRoundEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
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
      setRoundEvents(data.events || []);
      setCurrentEvent(data.currentEvent ?? data.events?.[0] ?? null);
      setCurrentEventIndex(data.currentEventIndex ?? 0);
      setTotalEvents(data.totalEvents ?? data.events?.length ?? 0);
      if (data.worldEvent) setWorldEvent(data.worldEvent);
      setLastResult(null);
    });

    socket.on('worldEventScheduled', ({ event }) => {
      if (event) setWorldEvent(event);
    });

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

  const submitEventDecision = useCallback((actionId, justifyAnswer, decisionTime) => {
    return new Promise((resolve) => {
      socketRef.current.emit(
        'submitEventDecision',
        { actionId, justifyAnswer, decisionTime },
        (res) => {
          if (res.success) {
            setCity(res.city);
            setLastResult(res.result);
            if (res.roundComplete) {
              setCurrentEvent(null);
            } else if (res.nextEvent) {
              setCurrentEvent(res.nextEvent);
              setCurrentEventIndex(res.currentEventIndex);
            }
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

  const triggerWorldEvent = useCallback((round) => {
    return new Promise((resolve) => {
      socketRef.current.emit('triggerWorldEvent', { round }, resolve);
    });
  }, []);

  return {
    connected,
    room,
    city,
    roundEvents,
    currentEvent,
    currentEventIndex,
    totalEvents,
    leaderboard,
    reportCards,
    worldEvent,
    lastResult,
    createRoom,
    joinRoom,
    startGame,
    submitEventDecision,
    advanceRound,
    triggerWorldEvent,
    socketId: socketRef.current?.id,
  };
}
