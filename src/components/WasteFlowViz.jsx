/** Sankey-style waste flow diagram for year summary. */

function barWidth(value, total, maxW = 100) {
  if (!total || total <= 0) return 0;
  return Math.max(2, Math.round((value / total) * maxW));
}

export default function WasteFlowViz({ flow, wmsGrade }) {
  if (!flow) return null;

  const total = flow.generated || 1;
  const streams = [
    { key: 'reduced', label: 'Prevented', color: 'bg-green-500', value: flow.reduced },
    { key: 'recycled', label: 'Recycled', color: 'bg-blue-500', value: flow.recycled },
    { key: 'incinerated', label: 'Burned', color: 'bg-orange-500', value: flow.incinerated },
    { key: 'landfilled', label: 'Landfilled', color: 'bg-gray-500', value: flow.landfilled },
    { key: 'uncollected', label: 'Uncollected', color: 'bg-red-500', value: flow.uncollected },
  ].filter((s) => s.value > 0.5);

  return (
    <div className="pixel-panel space-y-3 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-pixel text-[9px] text-pixel-yellow">WASTE FLOW (kt)</p>
        {flow.wms != null && (
          <p className="font-pixel text-[9px] text-pixel-green">
            WMS {flow.wms} — {wmsGrade || '—'}
          </p>
        )}
      </div>

      <p className="font-body text-xs text-gray-400">
        Generated: <span className="text-white">{Math.round(flow.generated)}</span> kt
      </p>

      <div className="flex h-8 w-full overflow-hidden rounded border border-pixel-border">
        {streams.map((s) => (
          <div
            key={s.key}
            className={`${s.color} h-full flex items-center justify-center`}
            style={{ width: `${barWidth(s.value, total, 100)}%` }}
            title={`${s.label}: ${Math.round(s.value)} kt`}
          />
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-1 font-body text-[10px] text-gray-400">
        {streams.map((s) => (
          <li key={s.key}>
            <span className={`inline-block w-2 h-2 rounded-sm mr-1 ${s.color}`} />
            {s.label}: {Math.round(s.value)} kt
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-3 gap-2 font-body text-[10px]">
        <div className="border border-pixel-border p-2">
          <p className="text-gray-500">Education</p>
          <p className="text-pixel-yellow font-pixel text-[10px]">{Math.round(flow.education ?? 0)}</p>
        </div>
        <div className="border border-pixel-border p-2">
          <p className="text-gray-500">Landfill left</p>
          <p className="text-pixel-yellow font-pixel text-[10px]">
            {Math.round(flow.landfillCapRemaining ?? 0)} kt
          </p>
          <p className="text-gray-600">~{flow.runway?.toFixed?.(1) ?? '—'} yr runway</p>
        </div>
        <div className="border border-pixel-border p-2">
          <p className="text-gray-500">CO₂ this year</p>
          <p className="text-pixel-yellow font-pixel text-[10px]">{Math.round(flow.co2 ?? 0)} kt</p>
        </div>
      </div>
    </div>
  );
}
