import { useState } from 'react';
import Leaderboard from './Leaderboard';
import ReportCard from './ReportCard';

export default function FinalReveal({ leaderboard, reportCards, socketId }) {
  const [revealIndex, setRevealIndex] = useState(-1);
  const [showReport, setShowReport] = useState(false);

  const myReport = reportCards?.find((r) => {
    const entry = leaderboard?.find((l) => l.studentName === r.studentName);
    return entry?.id === socketId;
  }) ?? reportCards?.[reportCards.length - 1];

  const startReveal = () => {
    setRevealIndex(leaderboard.length - 1);
    const interval = setInterval(() => {
      setRevealIndex((i) => {
        if (i <= 0) {
          clearInterval(interval);
          return 0;
        }
        return i - 1;
      });
    }, 800);
  };

  if (showReport) {
    return (
      <div className="min-h-screen p-4">
        <ReportCard report={myReport} />
        <div className="text-center mt-4">
          <button className="pixel-btn" onClick={() => setShowReport(false)}>
            ← Back to Podium
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="font-pixel text-lg text-pixel-yellow">FINAL REVEAL</h1>
        <p className="font-body text-gray-400 mt-2">Six years complete — who built the best Circular City?</p>
      </header>

      {revealIndex < 0 ? (
        <div className="text-center space-y-4">
          <div className="text-6xl">🏙️</div>
          <button className="pixel-btn text-base px-8" onClick={startReveal}>
            Reveal Rankings
          </button>
        </div>
      ) : (
        <div className="pixel-panel text-center space-y-4">
          <p className="font-pixel text-[10px] text-gray-400">
            {revealIndex === 0 ? '🎉 CHAMPION' : `RANK #${revealIndex + 1}`}
          </p>
          <p className="font-pixel text-xl text-pixel-green">
            {leaderboard[revealIndex]?.studentName}
          </p>
          <p className="font-pixel text-3xl text-pixel-yellow">
            {leaderboard[revealIndex]?.score}
          </p>
          {revealIndex === 0 && <p className="text-4xl animate-pulse-glow">🎊</p>}
        </div>
      )}

      <Leaderboard entries={leaderboard} highlightId={socketId} />

      <div className="text-center">
        <button className="pixel-btn" onClick={() => setShowReport(true)}>
          View My Report Card
        </button>
      </div>
    </div>
  );
}
