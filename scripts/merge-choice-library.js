/**
 * Merge CHOICE_LIBRARY v4 plain-language content into src/game/events.json
 * Run: node scripts/merge-choice-library.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIB_PATH =
  process.env.CHOICE_LIBRARY_PATH ||
  [
    path.join(__dirname, '../content/CHOICE_LIBRARY.md'),
    path.join(__dirname, '../../home/ubuntu/.cursor/projects/workspace/uploads/CHOICE_LIBRARY_7017.md'),
  ].find((p) => fs.existsSync(p));
const EVENTS_PATH = path.join(__dirname, '../src/game/events.json');

const WORLD_ID_MAP = {
  W1: 'w1-market-crash',
  W2: 'w2-carbon-tax',
  W3: 'w3-consumption-surge',
  W4: 'w4-landfill-fire',
  W5: 'w5-heatwave',
  W6: 'w6-monsoon-flooding',
  W7: 'w7-zero-waste-grant',
  W8: 'w8-plastic-import-ban',
  W9: 'w9-energy-spike',
  W10: 'w10-health-study',
  W11: 'w11-eco-award',
  W12: 'w12-recession',
  W13: 'w13-population-boom',
  W14: 'w14-ai-sorting',
  W15: 'w15-picker-strike',
  W16: 'w16-ocean-plastic',
  W17: 'w17-methane-risk',
  W18: 'w18-green-tourism',
  W19: 'w19-stricter-targets',
  W20: 'w20-climate-summit',
};

function splitList(text) {
  return text
    .split(/[;•]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseEventBlock(block) {
  const header = block.split('\n')[0];
  let eventId = null;

  const roundMatch = header.match(/^(r\d+_\w+)\s+—/);
  if (roundMatch) eventId = roundMatch[1];

  const worldMatch = header.match(/^(W\d+)\s+—/);
  if (worldMatch) eventId = WORLD_ID_MAP[worldMatch[1]];

  if (!eventId) return null;

  const sceneMatch = block.match(/\*\*Scene:\*\*\s*([\s\S]*?)(?=\n\*Concept:|\n- \*\*[A-D]\))/);
  const conceptMatch = block.match(/\*Concept:\s*([^*]+)\*/);

  const scene = sceneMatch ? sceneMatch[1].trim().replace(/\n+/g, ' ') : '';
  const conceptLink = conceptMatch ? conceptMatch[1].trim() : '';

  const actions = {};
  const choiceRegex =
    /-\s+\*\*([A-D])\)\s+"([^"]+)"\*\*\s+—\s+\*([^*]+)\*([\s\S]*?)(?=\n- \*\*[A-D]\)|\n---|\n## |$)/g;

  let m;
  while ((m = choiceRegex.exec(block)) !== null) {
    const letter = m[1].toLowerCase();
    const plainLabel = m[2].trim();
    const plainMeaning = m[3].trim();
    const tail = m[4];
    const prosMatch = tail.match(/✅\s*Pros:\s*([^\n]+)/);
    const consMatch = tail.match(/❌\s*Cons:\s*([^\n]+)/);
    actions[letter] = {
      plainLabel,
      plainMeaning,
      pros: prosMatch ? splitList(prosMatch[1]) : [],
      cons: consMatch ? splitList(consMatch[1]) : [],
    };
  }

  return { eventId, scene, conceptLink, actions };
}

function parseLibrary(md) {
  const sections = md.split(/^### /m).slice(1);
  const byId = {};
  for (const section of sections) {
    const parsed = parseEventBlock(section);
    if (parsed) byId[parsed.eventId] = parsed;
  }
  return byId;
}

function applyToEvent(event, overlay) {
  if (!overlay) return false;
  if (overlay.scene) {
    event.scene = overlay.scene;
    event.brief = overlay.scene;
  }
  if (overlay.conceptLink) event.conceptLink = overlay.conceptLink;

  const letters = ['a', 'b', 'c', 'd'];
  (event.actions || []).forEach((action, i) => {
    const letter =
      action.id?.length === 1 ? action.id.toLowerCase() : letters[i];
    const o = overlay.actions[letter];
    if (!o) return;
    action.plainLabel = o.plainLabel;
    action.plainMeaning = o.plainMeaning;
    action.pros = o.pros;
    action.cons = o.cons;
    if (overlay.conceptLink) action.conceptLink = overlay.conceptLink;
    action.label = o.plainLabel;
    if (o.pros.length && o.cons.length) {
      action.resultExplain = `${o.pros[0]} ${o.cons[0]}`;
    }
  });
  return true;
}

function main() {
  if (!fs.existsSync(LIB_PATH)) {
    console.error('Choice library not found:', LIB_PATH);
    process.exit(1);
  }
  const lib = parseLibrary(fs.readFileSync(LIB_PATH, 'utf8'));
  const data = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8'));

  let count = 0;
  const allEvents = [
    data.foundingEvent,
    ...data.roundEvents,
    ...data.worldEvents,
  ].filter(Boolean);

  for (const event of allEvents) {
    if (applyToEvent(event, lib[event.id])) count++;
  }

  for (const round of Object.keys(data.eventsByRound || {})) {
    for (const event of data.eventsByRound[round]) {
      applyToEvent(event, lib[event.id]);
    }
  }

  data.meta = {
    ...data.meta,
    choiceLibraryMergedAt: new Date().toISOString(),
    choiceLibraryOverlayCount: count,
  };

  fs.writeFileSync(EVENTS_PATH, JSON.stringify(data, null, 2));
  console.log(`Merged ${count}/${allEvents.length} events from choice library`);
  console.log(`Library entries parsed: ${Object.keys(lib).length}`);
  const missing = allEvents.filter((e) => !lib[e.id]).map((e) => e.id);
  if (missing.length) console.log('Missing overlays:', missing.slice(0, 10).join(', '), missing.length > 10 ? '...' : '');
}

main();
