import { useState, useEffect } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import JoinScreen from './components/JoinScreen';
import HostScreen from './components/HostScreen';
import RoundScreen from './components/RoundScreen';
import FinalReveal from './components/FinalReveal';
import LobbyScreen from './components/LobbyScreen';

export default function App() {
  const {
    connected,
    room,
    city,
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
    updateSessionConfig,
    getSessionCatalog,
    submitEventDecision,
    advanceRound,
    triggerWorldEvent,
    socketId,
  } = useGameSocket();

  const [screen, setScreen] = useState('join');
  const [hostCode, setHostCode] = useState('');

  const handleHost = async () => {
    const res = await createRoom();
    if (res.success) {
      setHostCode(res.code);
      setScreen('host');
    }
  };

  const handleJoin = async (code, name, archetype) => {
    const res = await joinRoom(code, name, archetype);
    if (res.success) setScreen('game');
    return res;
  };

  useEffect(() => {
    if (room?.phase === 'playing' && city) setScreen('game');
    if (room?.phase === 'reveal') setScreen('reveal');
  }, [room?.phase, city]);

  if (screen === 'join') {
    return (
      <JoinScreen onJoin={handleJoin} onHost={handleHost} connected={connected} />
    );
  }

  if (screen === 'host') {
    return (
      <HostScreen
        room={{ ...room, code: hostCode || room?.code }}
        leaderboard={leaderboard}
        onStart={startGame}
        onAdvance={advanceRound}
        onTriggerEvent={() => triggerWorldEvent(room?.currentRound)}
        onSaveSessionConfig={updateSessionConfig}
        onFetchSessionCatalog={getSessionCatalog}
      />
    );
  }

  if (screen === 'game' && room?.phase === 'lobby') {
    return (
      <LobbyScreen
        city={city}
        roomCode={room?.code}
        playerCount={room?.playerCount}
      />
    );
  }

  if (screen === 'reveal') {
    return (
      <FinalReveal
        leaderboard={leaderboard}
        reportCards={reportCards}
        socketId={socketId}
      />
    );
  }

  return (
    <RoundScreen
      city={city}
      currentEvent={currentEvent}
      currentEventIndex={currentEventIndex}
      totalEvents={totalEvents}
      room={room}
      worldEvent={worldEvent}
      lastResult={lastResult}
      onSubmit={submitEventDecision}
      leaderboard={leaderboard}
      socketId={socketId}
    />
  );
}
