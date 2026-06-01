import gameConfig from './gameConfig.json' with { type: 'json' };
import {
  foundingEvent,
  eventsByRound,
  roundEvents,
  worldEvents,
  buildRoundEventQueue,
} from './eventEngine.js';
import { applyQuizTierToEvent, applyQuizTierToEvents } from './quiz.js';

const ROUNDS = 6;
const ROUND_EVENTS_PER_YEAR = 3;

export function getSessionDefaults() {
  return {
    mode: 'random',
    quizTier: gameConfig.quiz?.defaultTier || 'standard',
    rounds: {},
  };
}

export function listRoundEventCatalog(round) {
  const pool = eventsByRound[String(round)] || eventsByRound[round] || [];
  if (pool.length) return pool.map((e) => ({ id: e.id, title: e.title, theme: e.theme }));
  return roundEvents
    .filter((e) => e.round === round)
    .map((e) => ({ id: e.id, title: e.title, theme: e.theme }));
}

export function listWorldEventCatalog() {
  return (worldEvents || gameConfig.worldEvents || []).map((e) => ({
    id: e.id,
    name: e.name,
    lectureHook: e.lectureHook,
  }));
}

export function getEventByIdFromCatalog(eventId) {
  if (foundingEvent?.id === eventId) return { ...foundingEvent };
  const fromRound = roundEvents.find((e) => e.id === eventId);
  if (fromRound) return { ...fromRound };
  for (const r of Object.keys(eventsByRound)) {
    const hit = (eventsByRound[r] || []).find((e) => e.id === eventId);
    if (hit) return { ...hit };
  }
  const we = (worldEvents || gameConfig.worldEvents || []).find((e) => e.id === eventId);
  if (we) return { ...we };
  return null;
}

export function buildSuggestedCuratedPlan(seed = Date.now()) {
  const rounds = {};
  let s = seed;
  const pickN = (arr, n) => {
    const copy = [...arr];
    const out = [];
    for (let i = 0; i < n && copy.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % copy.length;
      out.push(copy.splice(j, 1)[0]);
    }
    return out;
  };

  for (let round = 1; round <= ROUNDS; round++) {
    const catalog = listRoundEventCatalog(round).map((e) => e.id);
    const picked = pickN(catalog, Math.min(ROUND_EVENTS_PER_YEAR, catalog.length));
    let worldEventId = null;
    if (round >= 2) {
      const worlds = listWorldEventCatalog().map((e) => e.id);
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      worldEventId = worlds[s % worlds.length];
    }
    rounds[String(round)] = { roundEventIds: picked, worldEventId };
  }
  return rounds;
}

export function createTeacherSessionConfig(overrides = {}) {
  return {
    mode: 'curated',
    quizTier: overrides.quizTier || gameConfig.quiz?.defaultTier || 'standard',
    rounds: overrides.rounds || buildSuggestedCuratedPlan(),
  };
}

export function validateSessionPlan(sessionConfig) {
  const errors = [];
  if (!sessionConfig?.rounds) {
    errors.push('Missing round plan');
    return errors;
  }
  for (let round = 1; round <= ROUNDS; round++) {
    const key = String(round);
    const plan = sessionConfig.rounds[key];
    if (!plan) {
      errors.push(`Year ${round} not configured`);
      continue;
    }
    const ids = plan.roundEventIds || [];
    if (ids.length !== ROUND_EVENTS_PER_YEAR) {
      errors.push(`Year ${round} needs exactly ${ROUND_EVENTS_PER_YEAR} events (has ${ids.length})`);
    }
    const catalog = new Set(listRoundEventCatalog(round).map((e) => e.id));
    for (const id of ids) {
      if (!catalog.has(id)) errors.push(`Year ${round}: unknown event ${id}`);
    }
    if (new Set(ids).size !== ids.length) {
      errors.push(`Year ${round}: duplicate events selected`);
    }
    if (round >= 2 && !plan.worldEventId) {
      errors.push(`Year ${round} needs a world event`);
    }
    if (round === 1 && plan.worldEventId) {
      errors.push('Year 1 cannot have a world event');
    }
  }
  return errors;
}

function resolveWorldEventForPlan(sessionConfig, round) {
  if (round < 2) return null;
  const id = sessionConfig.rounds?.[String(round)]?.worldEventId;
  if (!id) return null;
  return getEventByIdFromCatalog(id);
}

/** Build event queue: random (solo) or teacher-curated (classroom). */
export function buildRoundEventQueueForSession(city, round, sessionConfig) {
  const cfg = sessionConfig || getSessionDefaults();
  const mode = cfg.mode || 'random';

  if (mode === 'random') {
    const world =
      round >= 2 ? resolveWorldEventForPlan({ ...cfg, rounds: cfg.randomWorldEvents }, round) : null;
    if (round >= 2 && !world && cfg.randomWorldEvents?.[String(round)]) {
      return buildRoundEventQueue(city, round, getEventByIdFromCatalog(cfg.randomWorldEvents[String(round)]));
    }
    return buildRoundEventQueue(city, round, world);
  }

  const plan = cfg.rounds[String(round)];
  if (!plan) return buildRoundEventQueue(city, round, null);

  const queue = [];
  if (round === 1) {
    queue.push({ ...foundingEvent, eventType: 'founding' });
  }
  for (const eventId of plan.roundEventIds || []) {
    const ev = getEventByIdFromCatalog(eventId);
    if (ev) queue.push({ ...ev, eventType: 'round' });
  }
  const worldEv = resolveWorldEventForPlan(cfg, round);
  if (worldEv && round >= 2) {
    queue.push({ ...worldEv, eventType: 'world' });
  }

  city.lastRoundEventIds = queue.filter((e) => e.eventType === 'round').map((e) => e.id);
  city.currentRoundEvents = queue;
  city.currentEventIndex = 0;
  city.roundEventsResolved = 0;
  city.roundComplete = false;
  return queue;
}

export function prepareRoundForSession(city, round, sessionConfig) {
  const queue = buildRoundEventQueueForSession(city, round, sessionConfig);
  const tier = sessionConfig?.quizTier || 'standard';
  return applyQuizTierToEvents(queue, tier);
}

export function scheduleRandomWorldEventsForSolo(seed = Date.now()) {
  const worlds = listWorldEventCatalog();
  const out = {};
  let s = seed;
  const used = [];
  for (let round = 2; round <= ROUNDS; round++) {
    const available = worlds.filter((w) => !used.includes(w.id));
    const pool = available.length ? available : worlds;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const pick = pool[s % pool.length];
    used.push(pick.id);
    out[String(round)] = pick.id;
  }
  return out;
}

export function createSoloSessionConfig(quizTier, seed) {
  return {
    mode: 'random',
    quizTier: quizTier || 'standard',
    randomWorldEvents: scheduleRandomWorldEventsForSolo(seed),
    rounds: {},
  };
}
