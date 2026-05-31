import WasteFlowViz from './WasteFlowViz.jsx';

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

      <p className="font-body text-xs text-gray-400 border-b border-gray-700 pb-3">
        Here is what your choices meant — the good and the tricky parts. Circular options are not
        always the best fit; every path has trade-offs.
      </p>

      {summary.wasteFlow && (
        <WasteFlowViz flow={summary.wasteFlow} wmsGrade={summary.wmsGrade} />
      )}

      {summary.flowVerdict && (
        <p className="font-body text-xs text-gray-300">{summary.flowVerdict}</p>
      )}

      <div className="space-y-3">
        <p className="font-pixel text-[8px] text-gray-400">YOUR DECISIONS THIS YEAR</p>
        {summary.entries.map((entry, i) => (
          <div key={i} className="border-l-2 border-pixel-accent pl-3 space-y-1.5">
            <p className="font-body text-sm font-medium">{entry.title}</p>
            <p className="font-body text-sm text-pixel-yellow">&ldquo;{entry.plainLabel}&rdquo;</p>
            {entry.plainMeaning && (
              <p className="font-body text-xs text-gray-400 italic">{entry.plainMeaning}</p>
            )}
            {entry.pros?.length > 0 && (
              <ul className="space-y-0.5">
                {entry.pros.map((p, j) => (
                  <li key={j} className="font-body text-xs text-green-400/90">
                    ✓ {p}
                  </li>
                ))}
              </ul>
            )}
            {entry.cons?.length > 0 && (
              <ul className="space-y-0.5">
                {entry.cons.map((c, j) => (
                  <li key={j} className="font-body text-xs text-red-300/90">
                    △ {c}
                  </li>
                ))}
              </ul>
            )}
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

      {summary.balanceLesson && (
        <p className="font-body text-xs text-gray-300 border-t border-gray-700 pt-2">
          <span className="font-pixel text-[8px] text-pixel-yellow">REMEMBER: </span>
          {summary.balanceLesson}
        </p>
      )}

      {summary.consequenceWatch && (
        <p className="font-body text-xs text-pixel-accent italic border-t border-gray-700 pt-2">
          <span className="font-pixel text-[8px] not-italic text-pixel-yellow">CONSEQUENCE WATCH: </span>
          {summary.consequenceWatch}
        </p>
      )}
    </div>
  );
}
