import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CityCanvas from './CityCanvas';
import PillarGauges from './PillarGauges';
import Leaderboard from './Leaderboard';
import YearSummary from './YearSummary';
import { gameConfig, getEventActionCost, getArchetypeProfile } from '../game/engine';
import { generateYearSummary, getDisplayLabel, getEventNarration } from '../game/yearSummary';
import { actionsWithDeferOption } from '../game/deferAction';
import { shuffleActions, shuffleJustifyOptions, shuffleSeedForEvent } from '../game/shuffleActions';

export default function RoundScreen({
  city,
  currentEvent,
  currentEventIndex,
  totalEvents,
  room,
  worldEvent,
  lastResult,
  onSubmit,
  leaderboard,
  socketId,
}) {
  const [phase, setPhase] = useState('growth');
  const [selectedAction, setSelectedAction] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [timer, setTimer] = useState(gameConfig.decisionTimerSeconds);
  const [submitted, setSubmitted] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);
  const startTime = useRef(Date.now());
  const prevRoundRef = useRef(room?.currentRound);
  const prevEventIdRef = useRef(currentEvent?.id);

  const yearSummary = useMemo(() => {
    if (!city || !room?.currentRound) return null;
    return generateYearSummary(city, room.currentRound);
  }, [city, room?.currentRound, roundComplete, phase]);

  const choiceSeed = useMemo(
    () => shuffleSeedForEvent(currentEvent, city?.id ?? socketId, room?.currentRound),
    [currentEvent, city?.id, socketId, room?.currentRound]
  );

  const shuffledChoices = useMemo(() => {
    if (!currentEvent) return [];
    return shuffleActions(actionsWithDeferOption(currentEvent), choiceSeed);
  }, [currentEvent, choiceSeed]);

  const shuffledJustify = useMemo(() => {
    if (!currentEvent?.justify) return null;
    return shuffleJustifyOptions(currentEvent.justify, choiceSeed);
  }, [currentEvent?.justify, choiceSeed]);

  useEffect(() => {
    if (city?.roundComplete) {
      setRoundComplete(true);
    }
  }, [city?.roundComplete]);

  useEffect(() => {
    const roundChanged = room?.currentRound !== prevRoundRef.current;
    const eventId = currentEvent?.id;
    const eventChanged = Boolean(eventId && eventId !== prevEventIdRef.current);

    prevRoundRef.current = room?.currentRound;
    prevEventIdRef.current = eventId;

    if (!roundChanged && !eventChanged) return;
    if (!eventId && !roundChanged) return;

    setPhase('growth');
    setSelectedAction(null);
    setQuizAnswer(null);
    setSubmitted(false);
    setRoundComplete(false);
    setTimer(gameConfig.decisionTimerSeconds);
    startTime.current = Date.now();

    const t1 = setTimeout(() => setPhase('event'), 1200);
    const t2 = setTimeout(() => setPhase('decide'), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [currentEvent?.id, room?.currentRound, city?.roundComplete]);

  const handleSubmit = useCallback(async () => {
    if (submitted || !selectedAction) return;
    if (phase === 'decide' && quizAnswer === null && currentEvent?.justify) {
      setPhase('quiz');
      return;
    }
    setSubmitted(true);
    const decisionTime = Date.now() - startTime.current;
    const res = await onSubmit(selectedAction, quizAnswer ?? 0, decisionTime);
    setPhase('resolution');
    if (res?.roundComplete) {
      setRoundComplete(true);
      setTimeout(() => setPhase('year_summary'), 2400);
    } else {
      setTimeout(() => {
        setSubmitted(false);
        setSelectedAction(null);
        setQuizAnswer(null);
        setPhase('growth');
        setTimeout(() => setPhase('event'), 1200);
        setTimeout(() => setPhase('decide'), 2800);
      }, 2200);
    }
  }, [submitted, phase, quizAnswer, selectedAction, onSubmit, currentEvent]);

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
  }, [phase, submitted, currentEvent?.id]);

  useEffect(() => {
    if (timer === 0 && phase === 'decide' && !submitted && selectedAction) {
      handleSubmit();
    }
  }, [timer, phase, submitted, selectedAction, handleSubmit]);

  const handleQuizSelect = (index) => {
    setQuizAnswer(index);
    setTimeout(() => handleSubmit(), 400);
  };

  const awaitingYearEnd =
    city?.roundComplete || roundComplete;

  if (
    !city ||
    (!currentEvent && !awaitingYearEnd && phase !== 'year_summary' && phase !== 'leaderboard')
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-pixel text-pixel-yellow animate-pulse">Waiting for round to start…</p>
      </div>
    );
  }

  if (phase === 'year_summary') {
    return (
      <div className="min-h-screen p-3 md:p-6 max-w-6xl mx-auto space-y-4">
        <header>
          <p className="font-pixel text-[10px] text-pixel-yellow">
            YEAR {room?.currentRound ?? 0} / 6 — YEAR IN REVIEW
          </p>
        </header>
        <PillarGauges pillars={city.pillars} />
        <YearSummary summary={yearSummary} />
        <button className="pixel-btn w-full" type="button" onClick={() => setPhase('leaderboard')}>
          Continue to class standings
        </button>
      </div>
    );
  }

  if (phase === 'leaderboard') {
    return (
      <div className="min-h-screen p-3 md:p-6 max-w-6xl mx-auto space-y-4">
        <header>
          <p className="font-pixel text-[10px] text-pixel-yellow">
            YEAR {room?.currentRound ?? 0} / 6 — ROUND COMPLETE
          </p>
        </header>
        <PillarGauges pillars={city.pillars} />
        {yearSummary && phase === 'leaderboard' && <YearSummary summary={yearSummary} />}
        <Leaderboard entries={leaderboard} highlightId={socketId} />
        <p className="font-body text-sm text-gray-400 text-center">
          Waiting for teacher to advance to the next year…
        </p>
      </div>
    );
  }

  const isWorld = currentEvent.eventType === 'world';
  const eventNum = currentEventIndex + 1;
  const animation = lastResult?.animationId || (isWorld ? worldEvent?.animationId : null);
  const narration = getEventNarration(currentEvent);

  return (
    <div className="min-h-screen p-3 md:p-6 max-w-6xl mx-auto space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-pixel text-[10px] text-pixel-yellow">
            YEAR {room?.currentRound ?? 1} / 6 · EVENT {eventNum}/{totalEvents || 4}
          </p>
          <p className="font-body text-xs text-gray-400">
            {city.studentName} · {getArchetypeProfile(city.archetype).label}
          </p>
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
          className={animation === 'landfill-fire' ? 'animate-shake' : ''}
        />

        <div className="space-y-4">
          {phase === 'growth' && (
            <div className="dialogue-box animate-pulse">
              <p className="font-pixel text-[9px] text-pixel-yellow mb-2">📈 GROWTH TICK</p>
              <p>Population and affluence rise — waste pressure builds…</p>
            </div>
          )}

          {(phase === 'event' || phase === 'decide' || phase === 'quiz') && (
            <div className="dialogue-box">
              <p className="font-pixel text-[9px] text-pixel-yellow mb-2">
                {isWorld
                  ? '⚡ WORLD EVENT'
                  : currentEvent.eventType === 'founding'
                    ? '🏛️ FOUNDING CHARTER'
                    : currentEvent.title.toUpperCase()}
              </p>
              {currentEvent.conceptLink && (
                <p className="text-[10px] text-pixel-accent/80 mb-2 italic">
                  {currentEvent.conceptLink}
                </p>
              )}
              <p className="mb-2 font-body text-sm leading-relaxed">{narration}</p>
              {currentEvent.caseFact && (
                <p className="text-xs text-pixel-accent italic mb-2 border-t border-gray-700 pt-2">
                  📚 {currentEvent.caseFact}
                </p>
              )}
              {isWorld && currentEvent.lectureHook && (
                <p className="text-xs text-gray-400">{currentEvent.lectureHook}</p>
              )}
            </div>
          )}

          {phase === 'decide' && (
            <div className="space-y-2">
              <p className="font-pixel text-[8px] text-gray-400">CHOOSE YOUR RESPONSE</p>
              <p className="font-body text-[10px] text-gray-500">
                City budget: <span className="text-pixel-yellow">💰{city.budget}</span> — you cannot
                afford every option. Use <span className="text-pixel-yellow">Defer</span> (💰0) if you
                are stuck; trade-offs appear in your year summary after this round.
              </p>
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {shuffledChoices.map(({ action, displayLetter }) => {
                  const actionCost = getEventActionCost(action, room?.marketModifiers, city.archetype);
                  const affordable = actionCost <= city.budget;
                  const label = getDisplayLabel(action);
                  const meaning = action.plainMeaning || action.meaning;
                  const isDefer = action.isDefer || action.id === 'defer';
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={!affordable && selectedAction !== action.id}
                      className={`choice-option ${
                        selectedAction === action.id ? 'selected' : ''
                      } ${!affordable ? 'opacity-50' : ''} ${isDefer ? 'border-dashed' : ''}`}
                      onClick={() => setSelectedAction(action.id)}
                      aria-label={`Option ${displayLetter}: ${label}`}
                    >
                      <span className="choice-option-letter" aria-hidden="true">
                        {displayLetter}
                      </span>
                      <span className="choice-option-body">
                        <span className="flex justify-between items-start gap-2 w-full">
                          <span className="choice-option-title">{label}</span>
                          <span className="font-pixel text-[8px] text-pixel-yellow shrink-0">
                            💰{actionCost}
                          </span>
                        </span>
                        {meaning && <span className="choice-option-meaning">{meaning}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                className="pixel-btn w-full"
                type="button"
                onClick={() =>
                  currentEvent.justify && quizAnswer === null ? setPhase('quiz') : handleSubmit()
                }
                disabled={submitted || !selectedAction}
              >
                Confirm Choice
              </button>
            </div>
          )}

          {phase === 'quiz' && shuffledJustify && (
            <div className="dialogue-box space-y-3">
              <p className="font-pixel text-[9px] text-pixel-yellow">💡 JUSTIFY YOUR CHOICE</p>
              <p className="font-body text-sm">{shuffledJustify.question}</p>
              {shuffledJustify.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
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
              <p className="font-pixel text-[9px] text-pixel-green mb-2">
                ✓ {lastResult.justifyCorrect ? 'INSIGHT +4' : 'RESOLVED'}
              </p>
              {lastResult.resultExplain && (
                <p className="font-body text-sm mb-2">{lastResult.resultExplain}</p>
              )}
              {Object.entries(lastResult.effects || {})
                .filter(([k]) =>
                  ['environment', 'economy', 'liveability', 'capacity', 'circularity'].includes(k)
                )
                .map(([k, v]) => (
                  <p key={k} className="font-body text-xs text-gray-400">
                    {v > 0 ? '+' : ''}
                    {v} {k}
                  </p>
                ))}
              <p className="font-body text-xs text-gray-500 mt-2">
                Balance: {city.balanceScore?.toFixed?.(1) ?? '—'} · Insight: {city.insightPoints}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
