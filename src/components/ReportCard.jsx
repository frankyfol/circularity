import CityCanvas from './CityCanvas';
import PillarGauges from './PillarGauges';

export default function ReportCard({ report }) {
  if (!report) return null;

  return (
    <div className="pixel-panel max-w-lg mx-auto space-y-4 print:break-inside-avoid">
      <div className="text-center">
        <p className="font-pixel text-[10px] text-pixel-yellow">CITY REPORT CARD</p>
        <h2 className="font-pixel text-sm mt-2">{report.studentName}</h2>
        <p className="font-body text-xs text-gray-400">
          {report.archetype === 'highIncome' ? 'High-Income City' : 'Low/Middle-Income City'} · Rank #{report.rank}
        </p>
      </div>

      <CityCanvas pillars={report.pillars} builtAssets={report.builtAssets} />

      <PillarGauges pillars={report.pillars} />

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-black/30 p-2 rounded">
          <p className="font-pixel text-[8px] text-gray-400">BALANCE</p>
          <p className="font-pixel text-sm text-pixel-green">{report.balanceScore}</p>
        </div>
        <div className="bg-black/30 p-2 rounded">
          <p className="font-pixel text-[8px] text-gray-400">FINAL</p>
          <p className="font-pixel text-sm text-pixel-yellow">{report.finalScore}</p>
        </div>
      </div>

      <div className="space-y-2 font-body text-sm">
        <p><span className="text-pixel-green">✓ Biggest win:</span> {report.biggestWin}</p>
        <p><span className="text-pixel-red">✗ Neglected:</span> {report.biggestMistake}</p>
        <p className="italic text-gray-300 border-t border-pixel-border pt-2">{report.verdict}</p>
      </div>

      <button
        className="pixel-btn w-full"
        onClick={() => window.print()}
      >
        Print Report Card
      </button>
    </div>
  );
}
