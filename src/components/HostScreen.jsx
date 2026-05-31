import Leaderboard from './Leaderboard';

export default function HostScreen({ room, leaderboard, onStart, onAdvance, onTriggerEvent }) {
  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <header className="text-center space-y-2">
        <h1 className="font-pixel text-lg text-pixel-yellow">TEACHER HOST</h1>
        <p className="font-pixel text-2xl tracking-widest text-white">{room?.code}</p>
        <p className="font-body text-gray-400">Share this room code with students</p>
      </header>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="pixel-panel">
          <p className="font-pixel text-[8px] text-gray-400">PLAYERS</p>
          <p className="font-pixel text-xl text-pixel-green">{room?.playerCount ?? 0}</p>
        </div>
        <div className="pixel-panel">
          <p className="font-pixel text-[8px] text-gray-400">PHASE</p>
          <p className="font-pixel text-sm text-pixel-yellow uppercase">{room?.phase ?? 'lobby'}</p>
        </div>
        <div className="pixel-panel">
          <p className="font-pixel text-[8px] text-gray-400">ROUND</p>
          <p className="font-pixel text-xl">{room?.currentRound ?? 0} / 6</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        {room?.phase === 'lobby' && (
          <button className="pixel-btn bg-pixel-green/30" onClick={onStart}>
            Start Game
          </button>
        )}
        {room?.phase === 'playing' && (
          <>
            <button className="pixel-btn" onClick={onAdvance}>
              Advance Round →
            </button>
            <button className="pixel-btn bg-pixel-red/30" onClick={onTriggerEvent}>
              Trigger World Event
            </button>
          </>
        )}
      </div>

      {room?.worldEvent && (
        <div className="pixel-panel text-center">
          <p className="font-pixel text-[8px] text-pixel-red">SCHEDULED EVENT (Round {room.worldEventRound})</p>
          <p className="font-body">{room.worldEvent.name}</p>
        </div>
      )}

      <Leaderboard entries={leaderboard} />

      <p className="font-body text-xs text-gray-500 text-center">
        Project this screen for the class. Students play on their devices; advance rounds when most have submitted.
      </p>
    </div>
  );
}
