export default function YearSummary({ summary }) {
  if (!summary) return null;

  return (
    <div className="dialogue-box space-y-4 border-2 border-pixel-yellow/40">
      <p className="font-pixel text-[10px] text-pixel-yellow">
        YEAR {summary.round} IN REVIEW — {summary.cityName}
      </p>
      <p className="font-body text-sm text-gray-400">
        Population {summary.population?.toLocaleString?.() ?? summary.population} · Waste load{' '}
        {summary.wasteLoad?.toLocaleString?.() ?? summary.wasteLoad}
      </p>

      <div className="space-y-3">
        <p className="font-pixel text-[8px] text-gray-400">YOU CHOSE</p>
        {summary.entries.map((entry, i) => (
          <div key={i} className="border-l-2 border-pixel-accent pl-3 space-y-1">
            <p className="font-body text-sm font-medium">{entry.title}</p>
            <p className="font-body text-sm text-pixel-yellow">&ldquo;{entry.plainLabel}&rdquo;</p>
            <p className="font-body text-xs text-green-400/90">👍 {entry.pro}</p>
            <p className="font-body text-xs text-red-300/90">👎 {entry.con}</p>
            {entry.netEffect && (
              <p className="font-body text-[10px] text-gray-500">📊 {entry.netEffect}</p>
            )}
          </div>
        ))}
      </div>

      <p className="font-body text-sm">
        <span className="text-pixel-yellow">Score change this year:</span>{' '}
        {summary.scoreChange >= 0 ? '+' : ''}
        {summary.scoreChange}
      </p>

      <p className="font-body text-sm">{summary.verdict}</p>

      {summary.consequenceWatch && (
        <p className="font-body text-xs text-pixel-accent italic border-t border-gray-700 pt-2">
          <span className="font-pixel text-[8px] not-italic text-pixel-yellow">CONSEQUENCE WATCH: </span>
          {summary.consequenceWatch}
        </p>
      )}
    </div>
  );
}
