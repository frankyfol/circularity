import Leaderboard from './Leaderboard';
import HostSessionSetup from './HostSessionSetup';

export default function HostScreen({
  room,
  leaderboard,
  onStart,
  onAdvance,
  onTriggerEvent,
  onSaveSessionConfig,
  onFetchSessionCatalog,
}) {
  const round = room?.currentRound ?? 0;
  const scheduledWorld = room?.roundWorldEvents?.[round];

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
          <p className="font-pixel text-xl">{round} / 6</p>
        </div>
      </div>

      {room?.phase === 'lobby' && onSaveSessionConfig && (
        <HostSessionSetup
          sessionConfig={room.sessionConfig}
          onSave={onSaveSessionConfig}
          onFetchCatalog={onFetchSessionCatalog}
        />
      )}

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
            {round >= 2 && (
              <button className="pixel-btn bg-pixel-red/30" onClick={onTriggerEvent}>
                Re-roll World Event (this round)
              </button>
            )}
          </>
        )}
      </div>

      {scheduledWorld && round >= 2 && (
        <div className="pixel-panel text-center">
          <p className="font-pixel text-[8px] text-pixel-red">WORLD EVENT · ROUND {round}</p>
          <p className="font-body">{scheduledWorld.name}</p>
          <p className="font-body text-xs text-gray-400 mt-1">{scheduledWorld.lectureHook}</p>
        </div>
      )}

      {room?.phase === 'playing' && (
        <div className="pixel-panel">
          <p className="font-pixel text-[8px] text-pixel-yellow mb-2">FLAG INSIGHT (teacher only)</p>
          <p className="font-body text-xs text-gray-400 mb-2">
            Each student&apos;s hidden consequence flags — emergent paths from founding + choices.
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {leaderboard?.map((entry) => (
              <div key={entry.id} className="text-xs border-b border-gray-700 pb-1">
                <span className="text-pixel-yellow">{entry.studentName}</span>
                {entry.roundComplete ? (
                  <span className="text-pixel-green ml-2">✓ round done</span>
                ) : (
                  <span className="text-gray-500 ml-2">in progress</span>
                )}
                <p className="text-gray-500 font-mono text-[10px] mt-0.5">
                  {(entry.flags || []).join(', ') || 'no flags yet'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Leaderboard entries={leaderboard} />

      <p className="font-body text-xs text-gray-500 text-center">
        Round 1: founding charter + 3 events. Rounds 2–6: 3 branched events + 1 world event each.
        Advance when most students finish all events in the round.
      </p>
    </div>
  );
}
