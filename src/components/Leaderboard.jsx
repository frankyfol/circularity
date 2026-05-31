export default function Leaderboard({ entries, highlightId, compact = false }) {
  if (!entries?.length) {
    return (
      <div className="pixel-panel text-center font-body text-gray-400">
        Waiting for players…
      </div>
    );
  }

  return (
    <div className="pixel-panel space-y-1 max-h-96 overflow-y-auto">
      <h3 className="font-pixel text-[10px] text-pixel-yellow mb-3">
        {compact ? '📊 LIVE RANKINGS' : '🏆 FINAL STANDINGS'}
      </h3>
      {entries.map((entry, i) => {
        const isMe = entry.id === highlightId;
        const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
        return (
          <div
            key={entry.id}
            className={`flex items-center justify-between py-2 px-2 rounded ${
              isMe ? 'bg-pixel-accent/20 border border-pixel-accent' : ''
            } ${i % 2 === 0 ? 'bg-black/20' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[9px] w-8">{medal}</span>
              <span className="font-body text-sm">{entry.studentName}</span>
              <span className="text-[10px] text-gray-500">
                {entry.archetype === 'highIncome' ? '🏙️' : '🏘️'}
              </span>
            </div>
            <div className="text-right">
              <span className="font-pixel text-[9px] text-pixel-green">{entry.score}</span>
              <span className="font-body text-[10px] text-gray-500 ml-2">
                +{entry.insightPoints} insight
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
