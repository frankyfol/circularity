import { useState } from 'react';
import IntroAnimation from './IntroAnimation';
import { getArchetypeProfile } from '../game/engine';

export default function JoinScreen({ onJoin, onHost, connected }) {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [archetype, setArchetype] = useState('highIncome');
  const [introDone, setIntroDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name');
    if (!code.trim()) return setError('Enter room code');
    setLoading(true);
    setError('');
    const res = await onJoin(code.trim().toUpperCase(), name.trim(), archetype);
    setLoading(false);
    if (!res.success) setError(res.error || 'Failed to join');
  };

  const handleHost = async () => {
    setLoading(true);
    await onHost();
    setLoading(false);
    setMode('host');
  };

  if (!introDone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <IntroAnimation onComplete={() => setIntroDone(true)} />
      </div>
    );
  }

  if (mode === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6">
        <header className="text-center space-y-2">
          <h1 className="font-pixel text-lg text-pixel-yellow">CIRCULAR CITY</h1>
          <p className="font-body text-gray-400 max-w-md">
            Urban sustainability simulation · H2 Geography · Balance wins, no dominant strategy
          </p>
          <p className={`font-body text-xs ${connected ? 'text-pixel-green' : 'text-pixel-red'}`}>
            {connected ? '● Connected to server' : '○ Connecting…'}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-4">
          <button className="pixel-btn" onClick={() => setMode('student')}>
            Join as Student
          </button>
          <button className="pixel-btn bg-pixel-green/30" onClick={handleHost}>
            Teacher Host
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'host') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="pixel-panel max-w-md w-full text-center space-y-4">
          <p className="font-pixel text-pixel-yellow text-xs">HOST MODE</p>
          <p className="font-body text-sm text-gray-300">
            Share the room code with students. You control round advancement from the host dashboard.
          </p>
          <button className="pixel-btn" onClick={() => setMode(null)}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleJoin} className="pixel-panel max-w-md w-full space-y-4">
        <h2 className="font-pixel text-xs text-pixel-yellow text-center">JOIN YOUR CITY</h2>

        <div>
          <label className="font-body text-xs text-gray-400 block mb-1">Your Name</label>
          <input
            className="w-full bg-pixel-bg border-2 border-pixel-border px-3 py-2 font-body text-sm focus:border-pixel-accent outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chief Sustainability Officer"
            maxLength={30}
          />
        </div>

        <div>
          <label className="font-body text-xs text-gray-400 block mb-1">Room Code</label>
          <input
            className="w-full bg-pixel-bg border-2 border-pixel-border px-3 py-2 font-pixel text-sm tracking-widest uppercase focus:border-pixel-accent outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCDE"
            maxLength={5}
          />
        </div>

        <div>
          <label className="font-body text-xs text-gray-400 block mb-2">City Archetype</label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              className={`strategy-card text-left p-3 ${archetype === 'highIncome' ? 'selected' : ''}`}
              onClick={() => setArchetype('highIncome')}
            >
              <p className="font-pixel text-[9px] text-pixel-yellow">🏙️ High-Income City</p>
              <p className="font-body text-xs text-gray-400 mt-1">
                {getArchetypeProfile('highIncome').tagline}
              </p>
            </button>
            <button
              type="button"
              className={`strategy-card text-left p-3 ${archetype === 'lowIncome' ? 'selected' : ''}`}
              onClick={() => setArchetype('lowIncome')}
            >
              <p className="font-pixel text-[9px] text-pixel-yellow">🏘️ Low/Middle-Income City</p>
              <p className="font-body text-xs text-gray-400 mt-1">
                {getArchetypeProfile('lowIncome').tagline}
              </p>
            </button>
          </div>
        </div>

        {error && <p className="font-body text-sm text-pixel-red">{error}</p>}

        <button type="submit" className="pixel-btn w-full" disabled={loading || !connected}>
          {loading ? 'Joining…' : 'Found My City'}
        </button>

        <button type="button" className="font-body text-xs text-gray-500 w-full" onClick={() => setMode(null)}>
          ← Back
        </button>
      </form>
    </div>
  );
}
