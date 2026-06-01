import { useEffect, useState } from 'react';

const ROUNDS = 6;
const EVENTS_PER_YEAR = 3;
const TIER_LABELS = {
  easy: 'Easy (+2 insight)',
  standard: 'Standard (+4 insight)',
  hard: 'Hard (+6 insight)',
};

export default function HostSessionSetup({ sessionConfig, onSave, onFetchCatalog }) {
  const [config, setConfig] = useState(sessionConfig);
  const [catalog, setCatalog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedYear, setExpandedYear] = useState(1);

  useEffect(() => {
    setConfig(sessionConfig);
  }, [sessionConfig]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await onFetchCatalog?.();
      if (!cancelled && res?.success) setCatalog(res);
    })();
    return () => {
      cancelled = true;
    };
  }, [onFetchCatalog]);

  const updateRound = (round, patch) => {
    const key = String(round);
    setConfig((c) => ({
      ...c,
      rounds: {
        ...c.rounds,
        [key]: { ...c.rounds?.[key], ...patch },
      },
    }));
  };

  const toggleEvent = (round, eventId) => {
    const key = String(round);
    const ids = [...(config.rounds?.[key]?.roundEventIds || [])];
    const idx = ids.indexOf(eventId);
    if (idx >= 0) ids.splice(idx, 1);
    else if (ids.length < EVENTS_PER_YEAR) ids.push(eventId);
    updateRound(round, { roundEventIds: ids });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const res = await onSave?.({ ...config, mode: 'curated' });
    setSaving(false);
    if (!res?.success) setError(res?.error || 'Could not save session plan');
  };

  const handleSuggest = () => {
    if (catalog?.suggestedPlan) {
      setConfig((c) => ({ ...c, mode: 'curated', rounds: catalog.suggestedPlan }));
    }
  };

  if (!config) return null;

  return (
    <div className="pixel-panel space-y-4">
      <div>
        <p className="font-pixel text-[8px] text-pixel-yellow mb-2">SESSION SETUP (before start)</p>
        <p className="font-body text-xs text-gray-400">
          Year 1 always opens with the founding charter for every class. Pick three city events per
          year and one world event for years 2–6.
        </p>
      </div>

      <div>
        <p className="font-pixel text-[8px] text-gray-400 mb-1">Quiz tier released to students</p>
        <select
          className="w-full bg-gray-900 border border-gray-600 p-2 font-body text-sm"
          value={config.quizTier || 'standard'}
          onChange={(e) => setConfig((c) => ({ ...c, quizTier: e.target.value }))}
        >
          {Object.entries(TIER_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="pixel-btn text-xs" onClick={handleSuggest}>
          Suggest balanced plan
        </button>
        <button type="button" className="pixel-btn bg-pixel-green/30 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save session plan'}
        </button>
      </div>

      {error && <p className="font-body text-xs text-pixel-red">{error}</p>}

      {!catalog ? (
        <p className="font-body text-xs text-gray-500">Loading event catalog…</p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {Array.from({ length: ROUNDS }, (_, i) => i + 1).map((round) => {
            const key = String(round);
            const plan = config.rounds?.[key] || {};
            const selected = plan.roundEventIds || [];
            const pool = catalog.roundEvents?.[round] || [];
            const isOpen = expandedYear === round;

            return (
              <div key={round} className="border border-gray-700 rounded p-2">
                <button
                  type="button"
                  className="w-full text-left font-pixel text-[9px] text-pixel-yellow"
                  onClick={() => setExpandedYear(isOpen ? 0 : round)}
                >
                  Year {round} · {selected.length}/{EVENTS_PER_YEAR} events
                  {round === 1 ? ' · founding charter included' : ''}
                </button>
                {isOpen && (
                  <div className="mt-2 space-y-2">
                    {round === 1 && (
                      <p className="font-body text-[10px] text-gray-500">
                        🏛️ Founding charter is fixed for all players.
                      </p>
                    )}
                    <div className="space-y-1">
                      {pool.map((ev) => {
                        const on = selected.includes(ev.id);
                        const full = !on && selected.length >= EVENTS_PER_YEAR;
                        return (
                          <label
                            key={ev.id}
                            className={`flex gap-2 items-start text-xs font-body cursor-pointer ${full ? 'opacity-40' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={full}
                              onChange={() => toggleEvent(round, ev.id)}
                            />
                            <span>
                              {ev.title}
                              {ev.theme ? (
                                <span className="text-gray-500"> · {ev.theme}</span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {round >= 2 && (
                      <select
                        className="w-full bg-gray-900 border border-gray-600 p-1 text-xs"
                        value={plan.worldEventId || ''}
                        onChange={(e) => updateRound(round, { worldEventId: e.target.value })}
                      >
                        <option value="">Select world event…</option>
                        {catalog.worldEvents?.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
