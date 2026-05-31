/** Shuffle event actions so display order varies (circular choices are not always first). */

function hashSeed(seed) {
  let s = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    s = (s * 31 + str.charCodeAt(i)) >>> 0;
  }
  return s || 1;
}

export function shuffleActions(actions, seed) {
  if (!actions?.length) return [];
  const arr = [...actions];
  let s = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.map((action, index) => ({
    action,
    displayLetter: String.fromCharCode(65 + index),
  }));
}

export function shuffleSeedForEvent(event, cityId, round) {
  return `${event?.id ?? 'ev'}:${cityId ?? 'city'}:${round ?? 0}`;
}

/** Shuffle insight (justify) options; returns new correctIndex for display order. */
export function shuffleJustifyOptions(justify, seed) {
  if (!justify?.options?.length) {
    return { ...justify, options: [], correctIndex: 0 };
  }
  const indexed = justify.options.map((text, i) => ({ text, i }));
  let s = hashSeed(`${seed}:justify`);
  for (let i = indexed.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return {
    question: justify.question,
    conceptTag: justify.conceptTag,
    options: indexed.map((x) => x.text),
    correctIndex: indexed.findIndex((x) => x.i === justify.correctIndex),
  };
}
