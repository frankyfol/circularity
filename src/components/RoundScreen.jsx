import { useState, useEffect, useRef, useCallback } from 'react';
import CityCanvas from './CityCanvas';
import PillarGauges from './PillarGauges';
import Leaderboard from './Leaderboard';
import { getStrategyCard, getCardCost, gameConfig } from '../game/engine';

const PHASES = ['growth', 'scenario', 'decide', 'quiz', 'resolution', 'leaderboard'];

export default function RoundScreen({
  city,
  scenario,
  room,
  worldEvent,
  lastResult,
  onSubmit,
  leaderboard,
  socketId,
}) {
  const [phase, setPhase] = useState('growth');
  const [selectedCards, setSelectedCards] = useState([]);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [timer, setTimer] = useState(gameConfig.decisionTimerSeconds);
  const [submitted, setSubmitted] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    setPhase('growth');
    setSelectedCards([]);
    setQuizAnswer(null);
    setSubmitted(false);
    setTimer(gameConfig.decisionTimerSeconds);
    startTime.current = Date.now();

    const t1 = setTimeout(() => setPhase('scenario'), 1500);
    const t2 = setTimeout(() => setPhase('decide'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [scenario?.round]);

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    if (phase === 'decide' && quizAnswer === null) {
      setPhase('quiz');
      return;
    }
    setSubmitted(true);
    const decisionTime = Date.now() - startTime.current;
    await onSubmit(selectedCards.length ? selectedCards : ['do-nothing'], quizAnswer ?? 0, decisionTime);
    setPhase('resolution');
    setTimeout(() => setPhase('leaderboard'), 2500);
  }, [submitted, phase, quizAnswer, selectedCards, onSubmit]);

  useEffect(() => {
    if (phase !== 'decide' || submitted) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, submitted]);

  useEffect(() => {
    if (timer === 0 && phase === 'decide' && !submitted) {
      handleSubmit();
    }
  }, [timer, phase, submitted, handleSubmit]);

  const toggleCard = (cardId) => {
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) return prev.filter((c) => c !== cardId);
      if (prev.length >= 3) return prev;
      return [...prev, cardId];
    });
  };

  const totalCost = selectedCards.reduce((sum, id) => {
    const card = getStrategyCard(id);
    return sum + (card ? getCardCost(city, card) : 0);
  }, 0);

  const handleQuizSelect = (index) => {
    setQuizAnswer(index);
    setTimeout(() => handleSubmit(), 500);
  };

  if (!city || !scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-pixel-yellow animate-pulse">Waiting for round to start…</p>
      </div>
    );
  }

  const animation = lastResult?.animations?.[0] || (worldEvent?.animationId ?? null);

  return (
    <div className="min-h-screen p-3 md:p-6 max-w-6xl mx-auto space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-pixel text-[10px] text-pixel-yellow">
            YEAR {room?.currentRound ?? scenario.round} / 6
          </p>
          <p className="font-body text-xs text-gray-400">{city.studentName}'s City</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[9px] text-pixel-yellow">💰 {city.budget}</span>
          {phase === 'decide' && (
            <div className="pixel-gauge w-24">
              <div
                className="pixel-gauge-fill bg-pixel-red"
                style={{ width: `${(timer / gameConfig.decisionTimerSeconds) * 100}%` }}
              />
            </div>
          )}
        </div>
      </header>

      <PillarGauges pillars={city.pillars} />

      <div className="grid md:grid-cols-2 gap-4">
        <CityCanvas
          pillars={city.pillars}
          builtAssets={city.builtAssets || []}
          animation={phase === 'resolution' ? animation : null}
          className={worldEvent?.animationId === 'landfill-fire' ? 'animate-shake' : ''}
        />

        <div className="space-y-4">
          {phase === 'growth' && (
            <div className="dialogue-box animate-pulse">
              <p className="font-pixel text-[9px] text-pixel-yellow mb-2">📈 GROWTH TICK</p>
              <p>Population and affluence rise — waste and footprint grow automatically…</p>
            </div>
          )}

          {(phase === 'scenario' || phase === 'decide' || phase === 'quiz') && (
            <div className="dialogue-box">
              <p className="font-pixel text-[9px] text-pixel-yellow mb-2">
                {scenario.title.toUpperCase()}
              </p>
              <p className="mb-2">{scenario.brief}</p>
              <p className="text-xs text-pixel-accent italic mb-2">📚 {scenario.caseFact}</p>
              <p className="text-xs text-gray-400">{scenario.decisionPrompt}</p>
            </div>
          )}

          {worldEvent && room?.currentRound === room?.worldEventRound && phase !== 'leaderboard' && (
            <div className="pixel-panel border-2 border-pixel-red bg-pixel-red/10">
              <p className="font-pixel text-[9px] text-pixel-red">⚡ WORLD EVENT</p>
              <p className="font-body text-sm mt-1">{worldEvent.name}</p>
              <p className="font-body text-xs text-gray-400 mt-1">{worldEvent.lectureHook}</p>
            </div>
          )}

          {phase === 'decide' && (
            <div className="space-y-2">
              <p className="font-pixel text-[8px] text-gray-400">
                SELECT 1–3 STRATEGIES · COST: {totalCost}/{city.budget}
              </p>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {scenario.options.map((cardId) => {
                  const card = getStrategyCard(cardId);
                  if (!card) return null;
                  const cost = getCardCost(city, card);
                  const affordable = cost <= city.budget;
                  return (
                    <button
                      key={cardId}
                      type="button"
                      disabled={!affordable && !selectedCards.includes(cardId)}
                      className={`strategy-card text-left p-3 ${
                        selectedCards.includes(cardId) ? 'selected' : ''
                      } ${!affordable ? 'opacity-50' : ''}`}
                      onClick={() => toggleCard(cardId)}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-pixel text-[8px] text-pixel-yellow">{card.name}</p>
                        <span className="font-pixel text-[8px] text-pixel-yellow">💰{cost}</span>
                      </div>
                      <p className="font-body text-xs text-gray-400 mt-1">{card.explainer}</p>
                      <p className="font-body text-[10px] text-gray-500 mt-1 capitalize">
                        Tier: {card.hierarchyTier}
                      </p>
                    </button>
                  );
                })}
              </div>
              <button
                className="pixel-btn w-full"
                onClick={() => (quizAnswer !== null ? handleSubmit() : setPhase('quiz'))}
                disabled={submitted}
              >
                Confirm Choices
              </button>
            </div>
          )}

          {phase === 'quiz' && scenario.quiz && (
            <div className="dialogue-box space-y-3">
              <p className="font-pixel text-[9px] text-pixel-yellow">💡 JUSTIFY YOUR CHOICE</p>
              <p className="font-body text-sm">{scenario.quiz.question}</p>
              {scenario.quiz.options.map((opt, i) => (
                <button
                  key={i}
                  className="strategy-card w-full text-left p-2 font-body text-sm"
                  onClick={() => handleQuizSelect(i)}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
          )}

          {phase === 'resolution' && lastResult && (
            <div className="dialogue-box">
              <p className="font-pixel text-[9px] text-pixel-green mb-2">✓ RESOLUTION</p>
              {lastResult.results?.map((r, i) => (
                <p key={i} className="font-body text-sm mb-1">
                  {r.card?.name}: applied
                  {Object.entries(r.effects || {})
                    .filter(([k]) => ['environment', 'economy', 'liveability', 'capacity', 'circularity'].includes(k))
                    .map(([k, v]) => ` · ${v > 0 ? '+' : ''}${v} ${k}`)
                    .join('')}
                </p>
              ))}
              <p className="font-body text-xs text-gray-400 mt-2">
                Balance score: {city.balanceScore?.toFixed?.(1) ?? city.balanceScore}
              </p>
            </div>
          )}

          {phase === 'leaderboard' && (
            <Leaderboard entries={leaderboard} highlightId={socketId} compact />
          )}
        </div>
      </div>
    </div>
  );
}
