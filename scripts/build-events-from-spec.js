/**
 * Parse EVENT_DATABASE_SPEC.md → src/game/events.json
 * Run: node scripts/build-events-from-spec.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ENTRY_BY_EVENT,
  PRIMARY_WEIGHTS,
  PRIMARY_INCINERATE_EXTRA,
} from './event-entry-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH =
  process.env.EVENT_SPEC_PATH ||
  path.join(__dirname, '../../home/ubuntu/.cursor/projects/workspace/uploads/EVENT_DATABASE_SPEC_4a0d.md');

const PILLAR_MAP = {
  env: 'environment',
  eco: 'economy',
  liv: 'liveability',
  cap: 'capacity',
  cir: 'circularity',
};

const CIRCULAR_TIERS = new Set(['reduce', 'reuse', 'recycle', 'policy', 'social']);

function parseEffects(str) {
  const effects = {};
  for (const m of str.matchAll(/\b(env|eco|liv|cap|cir)([+-]?\d+)\b/g)) {
    const key = PILLAR_MAP[m[1]];
    effects[key] = parseInt(m[2], 10);
  }
  return effects;
}

function parseFlags(segment) {
  const flags = [];
  for (const m of segment.matchAll(/`([A-Z_]+)`/g)) {
    if (!flags.includes(m[1])) flags.push(m[1]);
  }
  return flags;
}

function parseEntryFromHeader(headerLine) {
  const entry = { requiresFlags: [], excludedByFlags: [], weightModifiers: [], baseWeight: 1 };
  const entryMatch = headerLine.match(/\*\(entry:([^)]+)\)\*/i);
  if (!entryMatch) return entry;

  const text = entryMatch[1];
  if (/requires/i.test(text)) {
    const orMatch = text.match(/requires\s+`([^`]+)`(?:\s+OR\s+`([^`]+)`)+/gi);
    if (orMatch) {
      const flags = parseFlags(text.replace(/requires/i, ''));
      if (flags.length > 1) entry.requiresAnyFlags = flags;
      else entry.requiresFlags = flags;
    } else {
      entry.requiresFlags = parseFlags(text);
    }
  }
  const weightParts = text.match(/×(\d+)\s+if\s+`([^`]+)`/g) || [];
  for (const wp of weightParts) {
    const m = wp.match(/×(\d+)\s+if\s+`([^`]+)`/);
    if (m) entry.weightModifiers.push({ ifFlag: m[2], multiply: parseInt(m[1], 10) });
  }
  return entry;
}

function parseActionLine(line) {
  const actionMatch = line.match(/^\s*-\s+\*\*([A-D])\)\s+([^*]+)\*\*\s+(.+)$/);
  if (!actionMatch) return null;

  const label = actionMatch[2].trim();
  let rest = actionMatch[3];

  const whyMatch = rest.match(/\*\*Why:\*\*\s*(.+)$/);
  const resultExplain = whyMatch ? whyMatch[1].trim() : '';
  if (whyMatch) rest = rest.slice(0, whyMatch.index).trim();

  const tierMatch = rest.match(/^(reduce|reuse|recycle|incinerate|landfill|dump|policy|social)\s*·/);
  const hierarchyTier = tierMatch ? tierMatch[1] : 'policy';

  const costMatch = rest.match(/cost\s+(\d+)/i);
  const cost = costMatch ? parseInt(costMatch[1], 10) : 0;

  const effectsMatch = rest.match(/`([^`]+)`/);
  const effects = effectsMatch ? parseEffects(effectsMatch[1]) : {};

  const setsFlags = [];
  const clearsFlags = [];
  const arrowParts = rest.split('→').slice(1);
  for (const part of arrowParts) {
    if (/clear/i.test(part)) {
      clearsFlags.push(...parseFlags(part));
    } else {
      setsFlags.push(...parseFlags(part));
    }
  }
  if (rest.includes('clears')) {
    const clearM = rest.match(/clears\s+`([^`]+)`/);
    if (clearM && !clearsFlags.includes(clearM[1])) clearsFlags.push(clearM[1]);
  }

  let participationFactor;
  const partM = rest.match(/part\s*([+-]?\d*\.?\d+)/);
  if (partM) participationFactor = parseFloat(partM[1]);

  let marketExposure = 'none';
  if (/mkt\s+recyclables/i.test(rest)) marketExposure = 'recyclables';
  if (/mkt\s+energy/i.test(rest)) marketExposure = 'energy';

  let financing;
  let debtAmount;
  if (/financing\s+debt/i.test(rest)) {
    financing = 'debt';
    const debtM = rest.match(/debt\s+(\d+)/i);
    debtAmount = debtM ? parseInt(debtM[1], 10) : 15;
  }

  let delayedEffects;
  const delayM = rest.match(/delay\{(\d+),\s*([^}]+)\}/);
  if (delayM) {
    delayedEffects = { roundsDelay: parseInt(delayM[1], 10), ...parseEffects(delayM[2]) };
  }

  let animationId = hierarchyTier;
  if (hierarchyTier === 'dump') animationId = 'landfill';
  if (hierarchyTier === 'social') animationId = 'integrate-informal';

  return {
    id: actionMatch[1].toLowerCase(),
    label,
    hierarchyTier,
    cost,
    effects,
    participationFactor,
    marketExposure,
    financing,
    debtAmount,
    delayedEffects,
    setsFlags,
    clearsFlags,
    resultExplain,
    animationId,
  };
}

function parseJustify(block) {
  const m = block.match(
    /\*\*Justify:\*\*\s*\*([^*]+)\*\s*→\s*\[([^\]]+)\]\s*·\s*correct\s+(\d+)\s*·\s*tag\s+([\w-]+)/i
  );
  if (!m) return null;
  const options = m[2].split(/\s*\/\s*/).map((o) => o.trim());
  return {
    question: m[1].trim(),
    options,
    correctIndex: parseInt(m[3], 10),
    conceptTag: m[4],
  };
}

function mergeEntry(eventId, headerEntry, theme) {
  const entry = {
    requiresFlags: [],
    excludedByFlags: [],
    weightModifiers: [],
    baseWeight: 1,
    ...headerEntry,
  };

  const override = ENTRY_BY_EVENT[eventId];
  if (override) {
    if (override.requiresFlags) entry.requiresFlags = override.requiresFlags;
    if (override.requiresAnyFlags) entry.requiresAnyFlags = override.requiresAnyFlags;
    if (override.weightModifiers) {
      entry.weightModifiers = [...entry.weightModifiers, ...override.weightModifiers];
    }
  }

  for (const [flag, ids] of Object.entries(PRIMARY_WEIGHTS)) {
    if (ids.includes(eventId)) {
      const mult = PRIMARY_INCINERATE_EXTRA[eventId] || 2;
      entry.weightModifiers.push({ ifFlag: flag, multiply: mult });
    }
  }

  if (theme) entry.theme = theme;
  return entry;
}

function parseRoundEvents(spec) {
  const events = [];
  const eventBlocks = spec.split(/^### /m).slice(1);

  for (const block of eventBlocks) {
    if (block.startsWith('r') === false && !block.startsWith('r1_founding')) continue;
    const lines = block.split('\n');
    const headerLine = lines[0];
    if (headerLine.includes('TEACHER WORLD')) break;

    const headerMatch = headerLine.match(/^(r\d+_\w+)\s+—\s+"([^"]+)"/);
    if (!headerMatch) continue;

    const id = headerMatch[1];
    const title = headerMatch[2];
    const round = parseInt(id.match(/^r(\d+)/)[1], 10);

    const metaLine = lines.find((l) => l.startsWith('**Theme:**')) || '';
    const themeM = metaLine.match(/\*\*Theme:\*\*\s*([^.*]+)/);
    const briefM = metaLine.match(/\*\*Brief:\*\*\s*([^.*]+)/);
    const caseM = metaLine.match(/\*\*CaseFact:\*\*\s*\*([^*]+)\*/);

    const headerEntry = parseEntryFromHeader(headerLine);

    const actions = [];
    for (const line of lines) {
      const action = parseActionLine(line);
      if (action) actions.push(action);
    }

    const justifyBlock = lines.find((l) => l.includes('**Justify:**'));
    const justify = justifyBlock ? parseJustify(justifyBlock) : null;

    if (actions.length === 0 && id !== 'r1_founding') continue;

    const event = {
      id,
      round,
      title,
      theme: themeM ? themeM[1].trim() : '',
      brief: briefM ? briefM[1].trim() : '',
      caseFact: caseM ? caseM[1].trim() : '',
      entry: mergeEntry(id, headerEntry, themeM?.[1]?.trim()),
      actions,
      justify,
    };

    if (id === 'r1_founding') {
      events.founding = event;
    } else {
      events.push(event);
    }
  }

  return events;
}

function buildWorldEvents() {
  const defs = [
    {
      id: 'w1-market-crash',
      name: 'Recyclables Market Crash',
      lectureHook: 'China stops importing recyclables — many cities lost revenue overnight.',
      flatEffects: { recyclablesPriceMultiplier: 0.4, economy: -8 },
      conditionals: [
        { ifFlags: ['RECYCLING_SYSTEM'], effects: { economy: -6 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { economy: -3 } },
      ],
      justify: {
        question: 'Why is over-reliance on recyclables income risky?',
        options: [
          'Global markets can collapse and leave cities without revenue',
          'Recycling always profits',
          'Markets never change',
          'Only landfills earn money',
        ],
        correctIndex: 0,
        conceptTag: 'market-risk',
      },
    },
    {
      id: 'w2-carbon-tax',
      name: 'National Carbon/Landfill Tax',
      lectureHook: "Denmark's Polluter-Pays principle — disposal fees rise sharply.",
      flatEffects: {
        landfillCostMultiplier: 2.0,
        incinerationCostMultiplier: 1.5,
        economy: -5,
      },
      conditionals: [
        { ifFlags: ['DUMP_RELIANT'], effects: { economy: -6 } },
        { ifFlags: ['LANDFILL_BUILT'], effects: { economy: -6 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { economy: 3 } },
      ],
      justify: {
        question: 'Why does taxing disposal steer behaviour?',
        options: [
          'Higher disposal cost makes reduce/reuse/recycle relatively cheaper',
          'Taxes eliminate all waste',
          'Only rich cities pay',
          'Taxes have no behavioural effect',
        ],
        correctIndex: 0,
        conceptTag: 'polluter-pays',
      },
    },
    {
      id: 'w3-consumption-surge',
      name: 'Consumption Surge (COVID-style)',
      lectureHook: 'Singapore saw +1,334 tonnes of plastic during lockdown.',
      flatEffects: { wasteMultiplier: 1.45, capacity: -12 },
      conditionals: [
        { ifFlags: ['RECYCLING_SYSTEM'], effects: { capacity: 5 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { capacity: 5 } },
        { ifFlags: ['LINEAR_PATH'], effects: { capacity: -5 } },
      ],
      justify: {
        question: 'Why is low capacity headroom dangerous?',
        options: [
          'Sudden waste spikes overflow disposal before you can react',
          'Capacity never matters',
          'Spikes only help recycling',
          'Landfills expand automatically',
        ],
        correctIndex: 0,
        conceptTag: 'capacity',
      },
    },
    {
      id: 'w4-landfill-fire',
      name: 'Landfill Fire',
      lectureHook: 'Deonar 2016 — a 3-month fire blanketed Mumbai.',
      flatEffects: { environment: -12, liveability: -10 },
      conditionals: [
        { ifFlags: ['DUMP_RELIANT'], effects: { environment: -8, liveability: -8 } },
        { ifFlags: ['LANDFILL_BUILT'], effects: { environment: 4 } },
      ],
      animationId: 'landfill-fire',
      justify: {
        question: 'Why are dump fires catastrophic?',
        options: [
          'Uncontrolled sites burn for months, poisoning air and health',
          'Fires help recycling',
          'They only affect birds',
          'Engineered landfills always burn',
        ],
        correctIndex: 0,
        conceptTag: 'health',
      },
    },
    {
      id: 'w5-heatwave',
      name: 'Heatwave & Drought',
      lectureHook: 'Ecological deficit — high footprint cities face biocapacity stress.',
      flatEffects: { environment: -12, liveability: -8 },
      conditionals: [
        { ifFlags: ['POLLUTION_LEGACY'], effects: { environment: -6 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { liveability: 3 } },
      ],
      animationId: 'heatwave',
      justify: {
        question: 'Why does a high footprint worsen climate stress?',
        options: [
          'Cities in ecological deficit import resources and export damage, amplifying vulnerability',
          'Footprint only measures landfills',
          'Heatwaves ignore consumption',
          'Circularity increases drought',
        ],
        correctIndex: 0,
        conceptTag: 'ecological-footprint',
      },
    },
    {
      id: 'w6-monsoon-flooding',
      name: 'Monsoon Flooding',
      lectureHook: 'Manila/Can Tho — drains clogged by waste worsen floods.',
      flatEffects: { capacity: -8, liveability: -6, environment: -5 },
      conditionals: [
        { ifFlags: ['LINEAR_PATH'], effects: { liveability: -6 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { liveability: 2 } },
      ],
      justify: {
        question: 'Why does solid-waste management prevent floods?',
        options: [
          'Blocked drains from dumped waste worsen urban flooding',
          'Floods only come from rivers',
          'Waste floats away harmlessly',
          'Recycling causes floods',
        ],
        correctIndex: 0,
        conceptTag: 'health',
      },
    },
    {
      id: 'w7-zero-waste-grant',
      name: 'Zero-Waste Grant',
      lectureHook: 'Circular Copenhagen-style funding arrives.',
      flatEffects: { economy: 6 },
      conditionals: [
        { ifFlags: ['CIRCULAR_PATH'], effects: { circularity: 6, economy: 4 } },
        { ifFlags: ['ZERO_WASTE_AMBITION'], effects: { circularity: 6, economy: 4 } },
      ],
      justify: {
        question: 'Why do circular cities attract green finance?',
        options: [
          'Investors reward credible circular plans and participation',
          'Grants go only to landfills',
          'Finance ignores waste policy',
          'Circular cities never need money',
        ],
        correctIndex: 0,
        conceptTag: 'circular-metabolism',
      },
    },
    {
      id: 'w8-plastic-import-ban',
      name: 'Plastic Import Ban',
      lectureHook: 'Basel Convention tightening — waste exports blocked.',
      flatEffects: { capacity: -6, economy: -3 },
      conditionals: [
        { ifFlags: ['RECYCLING_SYSTEM'], effects: { circularity: 5 } },
        { ifFlags: ['LINEAR_PATH'], effects: { capacity: -5 } },
      ],
      justify: {
        question: "Why isn't exporting waste a real fix?",
        options: [
          'It shifts burden without reducing waste — bans expose dependence',
          'Export always solves capacity',
          'Bans help dumps',
          'Only rich countries export',
        ],
        correctIndex: 0,
        conceptTag: 'hinterland',
      },
    },
    {
      id: 'w9-energy-spike',
      name: 'Energy Price Spike',
      lectureHook: 'Global energy crisis reshapes waste-to-energy economics.',
      flatEffects: { energyPriceMultiplier: 1.6 },
      conditionals: [
        { ifFlags: ['INCINERATOR_BUILT'], effects: { economy: 8 } },
      ],
      defaultConditional: { effects: { economy: -3 } },
      justify: {
        question: "How do energy markets change incineration's value?",
        options: [
          'High energy prices reward plants that sell power; others pay more',
          'Energy prices never affect waste',
          'Incinerators shut down when prices rise',
          'Only landfills benefit',
        ],
        correctIndex: 0,
        conceptTag: 'incineration',
      },
    },
    {
      id: 'w10-health-study',
      name: 'Health Study Released',
      lectureHook: 'Downwind health impacts from waste facilities scrutinised.',
      flatEffects: { liveability: -5 },
      conditionals: [
        { ifFlags: ['INCINERATOR_BUILT'], effects: { liveability: -8, environment: -4 } },
        { ifFlags: ['PUBLIC_TRUST_LOW'], effects: { liveability: -4 } },
      ],
      justify: {
        question: 'Why do emissions monitoring and trust matter?',
        options: [
          'Health evidence and transparency affect liveability and policy acceptance',
          'Studies never influence cities',
          'Only economy matters',
          'NIMBY is unrelated to health',
        ],
        correctIndex: 0,
        conceptTag: 'health',
      },
    },
    {
      id: 'w11-eco-award',
      name: 'International Eco-Award',
      lectureHook: 'Yokohama-style "model city" recognition.',
      flatEffects: { liveability: 4 },
      conditionals: [
        { ifFlags: ['CIRCULAR_PATH'], effects: { liveability: 4, economy: 3 } },
        { ifFlags: ['PUBLIC_TRUST_HIGH'], effects: { liveability: 3 } },
      ],
      justify: {
        question: 'What earns sustainability recognition?',
        options: [
          'Credible circular metabolism and public participation',
          'Largest landfill',
          'Highest incineration',
          'Ignoring informal workers',
        ],
        correctIndex: 0,
        conceptTag: 'circular-metabolism',
      },
    },
    {
      id: 'w12-recession',
      name: 'Recession & Budget Cuts',
      lectureHook: 'Waste can be 20–50% of municipal budgets.',
      flatEffects: { economy: -8 },
      conditionals: [
        { ifFlags: ['DEBT_HEAVY'], effects: { economy: -6 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { economy: 2 } },
      ],
      justify: {
        question: 'Why do waste costs strain municipal budgets?',
        options: [
          'Disposal infrastructure and debt consume large shares of city spending',
          'Waste is always free',
          'Recessions eliminate waste',
          'Only recycling costs money',
        ],
        correctIndex: 0,
        conceptTag: 'economy',
      },
    },
    {
      id: 'w13-population-boom',
      name: 'Population Boom',
      lectureHook: 'Rural–urban migration swells the waste stream.',
      flatEffects: { wasteMultiplier: 1.3, capacity: -7, liveability: -3 },
      conditionals: [
        { ifFlags: ['LINEAR_PATH'], effects: { capacity: -5 } },
        { ifFlags: ['RECYCLING_SYSTEM'], effects: { capacity: 3 } },
      ],
      justify: {
        question: 'How does migration drive the waste stream?',
        options: [
          'More people and consumption increase waste faster than infrastructure',
          'Migration reduces waste',
          'Only affluence matters',
          'Population has no effect',
        ],
        correctIndex: 0,
        conceptTag: 'growth',
      },
    },
    {
      id: 'w14-ai-sorting',
      name: 'Tech Breakthrough: AI Sorting',
      lectureHook: 'Improved recovery technology spreads.',
      flatEffects: { circularity: 4 },
      conditionals: [
        { ifFlags: ['RECYCLING_SYSTEM'], effects: { circularity: 6, economy: 3 } },
      ],
      defaultConditional: { effects: { circularity: 2 } },
      justify: {
        question: 'Why does tech amplify existing recycling systems?',
        options: [
          'Sorting tech boosts yields where collection and markets already exist',
          'AI replaces all citizens',
          'Tech works without infrastructure',
          'Dumps become automatic recyclers',
        ],
        correctIndex: 0,
        conceptTag: 'circular-resource',
      },
    },
    {
      id: 'w15-picker-strike',
      name: 'Waste-Picker Strike',
      lectureHook: 'Informal sector leverage — collection stalls.',
      flatEffects: { capacity: -6, circularity: -5 },
      conditionals: [
        { ifFlags: ['INFORMAL_INTEGRATED'], effects: { capacity: 4, liveability: 3 } },
        { ifFlags: ['INFORMAL_EVICTED'], effects: { capacity: -6, liveability: -5 } },
      ],
      justify: {
        question: 'Why are informal recyclers essential infrastructure?',
        options: [
          'They recover large shares of waste — disruption hits capacity and circularity',
          'They only work in rich cities',
          'Strikes help landfills',
          'Formal systems never need them',
        ],
        correctIndex: 0,
        conceptTag: 'social-dimension',
      },
    },
    {
      id: 'w16-ocean-plastic',
      name: 'Ocean Plastic Scandal',
      lectureHook: 'Marine pollution traced to mismanaged land waste.',
      flatEffects: { environment: -8, liveability: -4 },
      conditionals: [
        { ifFlags: ['LINEAR_PATH'], effects: { environment: -6 } },
        { ifFlags: ['POLLUTION_LEGACY'], effects: { environment: -6 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { environment: 2 } },
      ],
      justify: {
        question: 'How does land waste become marine pollution?',
        options: [
          'Mismanaged waste reaches rivers and coasts',
          'Ocean plastic comes only from ships',
          'Landfills filter the sea',
          'Recycling causes marine litter',
        ],
        correctIndex: 0,
        conceptTag: 'water-pollution',
      },
    },
    {
      id: 'w17-methane-risk',
      name: 'Methane Explosion Risk',
      lectureHook: 'Landfill gas pockets threaten fires and explosions.',
      flatEffects: { environment: -6, liveability: -5 },
      conditionals: [
        { ifFlags: ['LANDFILL_BUILT'], effects: { environment: -6, capacity: -4 } },
        { ifFlags: ['DUMP_RELIANT'], effects: { environment: -6, capacity: -4 } },
      ],
      justify: {
        question: 'Why must landfill gas be managed?',
        options: [
          'Methane is explosive and a potent greenhouse gas',
          'Gas is harmless',
          'Only incinerators produce methane',
          'Flaring is illegal everywhere',
        ],
        correctIndex: 0,
        conceptTag: 'ghg',
      },
    },
    {
      id: 'w18-green-tourism',
      name: 'Green Tourism Surge',
      lectureHook: 'Clean, liveable cities attract visitors and investment.',
      flatEffects: { economy: 5, liveability: 3 },
      conditionals: [
        { ifFlags: ['CIRCULAR_PATH'], effects: { economy: 5, liveability: 3 } },
        { ifFlags: ['PUBLIC_TRUST_HIGH'], effects: { economy: 3 } },
        { ifFlags: ['POLLUTION_LEGACY'], effects: { economy: -3 } },
      ],
      justify: {
        question: 'How does environmental quality drive the economy?',
        options: [
          'Tourism and investment follow liveable, clean cities',
          'Pollution attracts tourists',
          'Economy ignores environment',
          'Only incineration helps tourism',
        ],
        correctIndex: 0,
        conceptTag: 'liveability',
      },
    },
    {
      id: 'w19-stricter-targets',
      name: 'Stricter Recycling Targets',
      lectureHook: 'National mandates raise compliance pressure.',
      flatEffects: { economy: -4 },
      conditionals: [
        { ifFlags: ['RECYCLING_SYSTEM'], effects: { circularity: 5, economy: 2 } },
        { ifFlags: ['CIRCULAR_PATH'], effects: { circularity: 5, economy: 2 } },
        { ifFlags: ['LINEAR_PATH'], effects: { economy: -6, liveability: -3 } },
      ],
      justify: {
        question: 'Why does regulation favour prepared cities?',
        options: [
          'Cities with recovery systems meet targets cheaper than linear cities scrambling',
          'Regulation bans all waste',
          'Targets only affect dumps',
          'Linear cities always win',
        ],
        correctIndex: 0,
        conceptTag: 'policy-design',
      },
    },
    {
      id: 'w20-climate-summit',
      name: 'Climate Summit Spotlight',
      lectureHook: 'Global scrutiny of city climate pledges.',
      flatEffects: { liveability: 2 },
      conditionals: [
        { ifFlags: ['ZERO_WASTE_AMBITION'], effects: { circularity: 6, economy: 4, liveability: 4 } },
        { ifFlags: ['LINEAR_PATH'], effects: { liveability: -5, economy: -3 } },
      ],
      justify: {
        question: 'Why does credible climate action pay reputational dividends?',
        options: [
          'Transparent circular plans build trust and investment; greenwashing backfires',
          'Summits ignore cities',
          'Only landfills matter at summits',
          'Pledges need no action',
        ],
        correctIndex: 0,
        conceptTag: 'circular-metabolism',
      },
    },
  ];

  return defs.map((def) => ({
    ...def,
    minRound: 2,
    actions: worldEventActions(def),
  }));
}

function worldEventActions(def) {
  const soften = { environment: 3, liveability: 3, economy: -6 };
  const adapt = { liveability: 1, economy: -2 };
  return [
    {
      id: 'mitigate',
      label: 'Invest to mitigate',
      hierarchyTier: 'policy',
      cost: 10,
      effects: soften,
      setsFlags: ['PUBLIC_TRUST_HIGH'],
      resultExplain: 'You spent budget to soften the shock and maintain public trust.',
      animationId: 'reduce',
    },
    {
      id: 'adapt',
      label: 'Adapt cheaply',
      hierarchyTier: 'policy',
      cost: 4,
      effects: adapt,
      resultExplain: 'A modest response limits damage without major spending.',
      animationId: 'none',
    },
    {
      id: 'absorb',
      label: 'Absorb the shock',
      hierarchyTier: 'dump',
      cost: 0,
      effects: {},
      setsFlags: ['PUBLIC_TRUST_LOW'],
      resultExplain: 'You took the full hit — conditional flag effects still apply based on your city path.',
      animationId: 'none',
    },
  ];
}

function main() {
  let specPath = SPEC_PATH;
  if (!fs.existsSync(specPath)) {
    specPath = path.join(__dirname, '../EVENT_DATABASE_SPEC.md');
  }
  if (!fs.existsSync(specPath)) {
    const alt = '/home/ubuntu/.cursor/projects/workspace/uploads/EVENT_DATABASE_SPEC_ce1b.md';
    specPath = fs.existsSync(alt) ? alt : specPath;
  }

  const spec = fs.readFileSync(specPath, 'utf8');
  const parsed = parseRoundEvents(spec);
  const foundingEvent = parsed.founding;
  delete parsed.founding;
  const roundEvents = Array.isArray(parsed) ? parsed : Object.values(parsed).filter((e) => e?.id);

  const eventsByRound = {};
  for (const ev of roundEvents) {
    if (!eventsByRound[ev.round]) eventsByRound[ev.round] = [];
    eventsByRound[ev.round].push(ev);
  }

  const worldEvents = buildWorldEvents();

  const output = {
    foundingEvent,
    roundEvents,
    eventsByRound,
    worldEvents,
    meta: {
      roundEventCount: roundEvents.length,
      worldEventCount: worldEvents.length,
      generatedAt: new Date().toISOString(),
    },
  };

  const outPath = path.join(__dirname, '../src/game/events.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(`  Founding: ${foundingEvent?.id}`);
  console.log(`  Round events: ${roundEvents.length}`);
  for (let r = 1; r <= 6; r++) {
    console.log(`    Round ${r}: ${(eventsByRound[r] || []).length} events`);
  }
  console.log(`  World events: ${worldEvents.length}`);
}

main();
