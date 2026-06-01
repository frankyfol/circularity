/**
 * Merge content/quizzes.json tier questions into src/game/events.json
 * Adds justifyTiers { easy, standard, hard } and sets justify = standard by default.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUIZ_PATH = path.join(__dirname, '../content/quizzes.json');
const EVENTS_PATH = path.join(__dirname, '../src/game/events.json');

function tierToJustify(tier) {
  if (!tier) return null;
  return {
    question: tier.question,
    options: tier.options,
    correctIndex: tier.correctIndex,
    conceptTag: tier.conceptTag || 'concept',
    optionExplanations: tier.optionExplanations || [],
  };
}

function applyQuizzesToEvent(event, quizEntry) {
  if (!quizEntry) return;
  const tiers = {};
  for (const name of ['easy', 'standard', 'hard']) {
    if (quizEntry[name]) tiers[name] = tierToJustify(quizEntry[name]);
  }
  if (Object.keys(tiers).length) {
    event.justifyTiers = tiers;
    event.justify = tiers.standard || tiers.easy || Object.values(tiers)[0];
  }
}

function walkEvents(data, quizzes) {
  let count = 0;
  const apply = (event) => {
    if (!event?.id) return;
    const q = quizzes[event.id];
    if (q) {
      applyQuizzesToEvent(event, q);
      count++;
    }
  };
  if (data.foundingEvent) apply(data.foundingEvent);
  for (const ev of data.roundEvents || []) apply(ev);
  for (const ev of data.worldEvents || []) apply(ev);
  for (const round of Object.keys(data.eventsByRound || {})) {
    for (const ev of data.eventsByRound[round]) apply(ev);
  }
  return count;
}

const quizzes = JSON.parse(fs.readFileSync(QUIZ_PATH, 'utf8')).quizzes || {};
const data = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8'));
const merged = walkEvents(data, quizzes);
fs.writeFileSync(EVENTS_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Merged quiz tiers onto ${merged} events`);
