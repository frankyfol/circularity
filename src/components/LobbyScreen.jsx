export default function LobbyScreen({ city, roomCode, playerCount }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="pixel-panel max-w-md w-full text-center space-y-4">
        <p className="font-pixel text-pixel-yellow text-xs">LOBBY</p>
        <h2 className="font-pixel text-sm">{city?.studentName}'s City</h2>
        <p className="font-body text-sm text-gray-400">
          {city?.archetype === 'highIncome' ? '🏙️ High-Income City' : '🏘️ Low/Middle-Income City'}
        </p>
        <div className="text-4xl animate-pulse-glow">🏗️</div>
        <p className="font-body text-sm text-gray-300">
          Waiting for teacher to start…<br />
          Room <span className="font-pixel text-pixel-yellow">{roomCode}</span> · {playerCount} cities founded
        </p>
      </div>
    </div>
  );
}
