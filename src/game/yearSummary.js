import { PILLAR_KEYS, calculateBalanceScore } from './engine.js';

const CIRCULAR_TIERS = new Set(['reduce', 'reuse', 'recycle']);

const FLAG_FORESHADOW = {
  PRIMARY_DISPOSE: 'Your disposal-first path will keep land and health pressures in the spotlight.',
  PRIMARY_INCINERATE: 'The incinerator path means emissions and neighbour trust will keep coming back.',
  PRIMARY_RECYCLE: 'Your recycling bet pays off when markets cooperate — but they can swing.',
  PRIMARY_REDUCE: 'Prevention-first choices compound — zero-waste doors are opening.',
  LINEAR_PATH: 'Linear habits are stacking — expect more pollution and crisis events ahead.',
  CIRCULAR_PATH: 'Circular momentum is building — grants and markets may favour you.',
  DUMP_RELIANT: 'Your open dump will haunt you — health risks and fires are rising.',
  LANDFILL_BUILT: 'Engineered landfill buys time — leachate and gas management matter now.',
  INCINERATOR_BUILT: 'The incinerator binds you — energy wins and air-quality fights ahead.',
  RECYCLING_SYSTEM: 'Recycling infrastructure helps you weather market shocks.',
  TAX_IMPOSED: 'New taxes may trigger backlash or illegal dumping.',
  INFORMAL_INTEGRATED: 'Integrated pickers are an asset — social wins may follow.',
  INFORMAL_EVICTED: 'Evict pickers may strike back — capacity could suffer.',
  PUBLIC_TRUST_LOW: 'Low public trust will make the next big policy harder.',
  PUBLIC_TRUST_HIGH: 'High trust makes the next siting or tax easier to sell.',
  DEBT_HEAVY: 'Heavy debt — the next budget squeeze will hurt more.',
  POLLUTION_LEGACY: 'Pollution is accumulating — heat and health events may bite harder.',
  ZERO_WASTE_AMBITION: 'Zero-waste ambition — late-game circular options are unlocking.',
};

function formatPillarDelta(effects) {
  return PILLAR_KEYS.filter((k) => effects?.[k])
    .map((k) => `${effects[k] > 0 ? '+' : ''}${effects[k]} ${k}`)
    .join(', ');
}

export function recordRoundResolution(city, event, action, effects, scoreBefore) {
  if (!city.roundResolutions) city.roundResolutions = [];
  city.roundResolutions.push({
    eventId: event.id,
    eventTitle: event.title,
    eventType: event.eventType,
    plainLabel: action.plainLabel || action.label,
    plainMeaning: action.plainMeaning || '',
    hierarchyTier: action.hierarchyTier,
    pros: [...(action.pros || [])],
    cons: [...(action.cons || [])],
    effects: { ...effects },
    setsFlags: action.setsFlags || [],
    scoreBefore,
  });
}

export function clearRoundResolutions(city) {
  city.roundResolutions = [];
}

function buildBalanceLesson(resolutions) {
  const circularCount = resolutions.filter((r) =>
    CIRCULAR_TIERS.has(r.hierarchyTier)
  ).length;
  const lines = [
    'There is no single "always right" button — even circular-sounding options can strain budget, trust, or capacity if the timing is wrong. The winning strategy is balance across all five pillars, not picking the greenest label every time.',
  ];
  if (circularCount >= resolutions.length - 1 && resolutions.length >= 2) {
    lines.push(
      'You leaned circular this year. Watch whether economy or liveability are falling behind — recycling and reduction only pay off when residents participate and markets hold up.'
    );
  } else if (circularCount === 0 && resolutions.length >= 2) {
    lines.push(
      'You avoided circular options this year. That can stabilise the budget short term, but land, health, or footprint pressures may build unless you invest in recovery or prevention later.'
    );
  }
  return lines.join(' ');
}

export function generateYearSummary(city, round) {
  const resolutions = city.roundResolutions || [];
  const scoreNow = (city.balanceScore || 0) + (city.insightPoints || 0);
  const scoreStart = resolutions[0]?.scoreBefore ?? scoreNow;
  const scoreChange = Math.round((scoreNow - scoreStart) * 10) / 10;

  const entries = resolutions.map((r) => ({
    title: r.eventTitle,
    plainLabel: r.plainLabel,
    plainMeaning: r.plainMeaning,
    pros: r.pros || [],
    cons: r.cons || [],
    netEffect: formatPillarDelta(r.effects),
    setsFlags: r.setsFlags,
  }));

  const pillars = PILLAR_KEYS.map((k) => ({ key: k, value: city.pillars[k] }));
  pillars.sort((a, b) => a.value - b.value);
  const weakest = pillars[0];
  const spread = pillars[pillars.length - 1].value - weakest.value;

  let verdict;
  if (spread <= 15) {
    verdict = `Year ${round} kept your five pillars fairly balanced. The geometric-mean score rewards that balance more than maxing out any one "sustainable" choice.`;
  } else {
    verdict = `Year ${round} left ${weakest.key} as your weakest pillar (${weakest.value}). Neglecting one pillar pulls down your overall score — even if other choices looked greener on paper.`;
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
    balanceLesson: buildBalanceLesson(resolutions),
    consequenceWatch: watches.length ? watches.join(' ') : null,
  };
}

export function getDisplayLabel(action) {
  return action.plainLabel || action.label;
}

export function getEventNarration(event) {
  return event.scene || event.brief || '';
}
