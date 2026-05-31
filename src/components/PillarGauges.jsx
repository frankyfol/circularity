const PILLAR_META = {
  environment: { label: 'Environment', icon: '🌱', color: 'bg-pixel-green' },
  economy: { label: 'Economy', icon: '💰', color: 'bg-pixel-yellow' },
  liveability: { label: 'Liveability', icon: '❤️', color: 'bg-red-400' },
  capacity: { label: 'Capacity', icon: '🗑️', color: 'bg-gray-400' },
  circularity: { label: 'Circularity', icon: '♻️', color: 'bg-pixel-accent' },
};

export default function PillarGauges({ pillars, popups = [] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 relative">
      {Object.entries(PILLAR_META).map(([key, meta]) => (
        <div key={key} className="pixel-panel p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-pixel text-[8px] text-pixel-yellow">{meta.icon}</span>
            <span className="font-pixel text-[7px] text-gray-300">{pillars[key]}</span>
          </div>
          <div className="pixel-gauge">
            <div
              className={`pixel-gauge-fill ${meta.color}`}
              style={{ width: `${pillars[key]}%` }}
            />
          </div>
          <p className="font-body text-[10px] text-gray-400 mt-1 hidden sm:block">{meta.label}</p>
        </div>
      ))}
      {popups.map((p, i) => (
        <div
          key={i}
          className="absolute animate-float-up font-pixel text-[10px] text-pixel-yellow pointer-events-none"
          style={{ left: p.x, top: p.y }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
}
