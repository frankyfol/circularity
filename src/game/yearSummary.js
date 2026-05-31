import { PILLAR_KEYS, calculateBalanceScore, gameConfig } from './engine.js';

const FLAG_FORESHADOW = {
  PRIMARY_DISPOSE: 'Your disposal-first path will keep land and health pressures in the spotlight.',
  PRIMARY_INCINERATE: 'The incinerator path means emissions and neighbour trust will keep coming back.',
  PRIMARY_RECYCLE: 'Your recycling bet pays off when markets cooperate — but they can swing.',
  PRIMARY_REDUCE: 'Prevention-first choices compound — zero-waste doors are opening.',
  LINEAR_PATH: 'Linear habits are stacking — expect more pollution and crisis events ahead.',
  CIRCULAR_PATH: 'Circular momentum is building — grants, markets and policy may favour you.',
  DUMP_RELIANT: 'Your open dump will haunt you — health risks and fires are rising.',
  LANDFILL_BUILT: 'Engineered landfill buys time — leachate and gas management matter now.',
  INCINERATOR_BUILT: 'The incinerator binds you — energy wins and air-quality fights ahead.',
  RECYCLING_SYSTEM: 'Recycling infrastructure helps you weather market shocks.',
  TAX_IMPOSED: 'New taxes may trigger backlash or illegal dumping.',
  INFORMAL_INTEGRATED: 'Integrated pickers are an asset — social wins may follow.',
  INFORMAL_EVICTED: 'Evicted pickers may strike back — capacity could suffer.',
  PUBLIC_TRUST_LOW: 'Low public trust will make the next big policy harder.',
  PUBLIC_TRUST_HIGH: 'High trust makes the next siting or tax easier to sell.',
  DEBT_HEAVY: 'Heavy debt — the next budget squeeze will hurt more.',
  POLLUTION_LEGACY: 'Pollution is accumulating — heat and health events may bite harder.',
  ZERO_WASTE_AMBITION: 'Zero-waste ambition — late-game circular options are unlocking.',
};

function topPillarDelta(effects) {
  let best = null;
  let worst = null;
  for (const key of PILLAR_KEYS) {
    const v = effects?.[key];
    if (!v) continue;
    if (!best || v > best.delta) best = { key, delta: v };
    if (!worst || v < worst.delta) worst = { key, delta: v };
  }
  return { best, worst };
}

function pickProCon(action, effects) {
  const { best, worst } = topPillarDelta(effects);
  const pros = action.pros || [];
  const cons = action.cons || [];
  const pro = pros[0] || 'Helps your city balance.';
  const con = cons[0] || 'Trade-offs remain for later years.';
  return { pro, con, best, worst };
}

function formatPillarDelta(effects) {
  return PILLAR_KEYS.filter((k) => effects?.[k])
    .map((k) => `${effects[k] > 0 ? '+' : ''}${effects[k]} ${k}`)
    .join(', ');
}

export function recordRoundResolution(city, event, action, effects, scoreBefore) {
  if (!city.roundResolutions) city.roundResolutions = [];
  const { pro, con } = pickProCon(action, effects);
  city.roundResolutions.push({
    eventId: event.id,
    eventTitle: event.title,
    eventType: event.eventType,
    plainLabel: action.plainLabel || action.label,
    pro,
    con,
    effects: { ...effects },
    setsFlags: action.setsFlags || [],
    scoreBefore,
    scoreAfter: calculateBalanceScore(city) + (city.insightPoints || 0),
  });
}

export function clearRoundResolutions(city) {
  city.roundResolutions = [];
}

export function generateYearSummary(city, round) {
  const resolutions = city.roundResolutions || [];
  const scoreNow = (city.balanceScore || 0) + (city.insightPoints || 0);
  const scoreStart = resolutions[0]?.scoreBefore ?? scoreNow;
  const scoreChange = Math.round((scoreNow - scoreStart) * 10) / 10;

  const entries = resolutions.map((r) => ({
    title: r.eventTitle,
    plainLabel: r.plainLabel,
    pro: r.pro,
    con: r.con,
    netEffect: formatPillarDelta(r.effects),
    setsFlags: r.setsFlags,
  }));

  const pillars = PILLAR_KEYS.map((k) => ({ key: k, value: city.pillars[k] }));
  pillars.sort((a, b) => a.value - b.value);
  const weakest = pillars[0];
  const spread = pillars[pillars.length - 1].value - weakest.value;

  let verdict;
  if (spread <= 15) {
    verdict = `Year ${round} was relatively balanced — your pillars moved together. Keep nurturing all five; the geometric-mean score rewards balance, not one hero stat.`;
  } else {
    verdict = `Year ${round} left **${weakest.key}** as your weakest pillar (${weakest.value}). In this game, a single neglected pillar drags the whole sustainability score down.`;
  }

  const newFlags = new Set();
  for (const r of resolutions) {
    for (const f of r.setsFlags) newFlags.add(f);
  }
  const watches = [...newFlags]
    .map((f) => FLAG_FORESHADOW[f])
    .filter(Boolean)
    .slice(0, 2);

  return {
    round,
    cityName: city.studentName,
    population: city.population,
    wasteLoad: city.wasteLoad,
    entries,
    scoreChange,
    verdict,
    consequenceWatch: watches.length ? watches.join(' ') : null,
  };
}

export function getDisplayLabel(action) {
  return action.plainLabel || action.label;
}

export function getEventNarration(event) {
  return event.scene || event.brief || '';
}
