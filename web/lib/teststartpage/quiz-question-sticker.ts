/**
 * Pick a sticker-style visual (library sticker or word→emoji) from quick-quiz question content.
 */

import type { TestStartQuizQuestion } from "@/lib/curated-sentences/quiz-compiler";
import {
  pickStickerForQuizFallback,
  STICKER_LIBRARY,
  type StickerDef,
  type StickerRarity,
} from "@/lib/progress/sticker-library";

/** Minimal shape for {@link QuizStickerFallback} — may omit `id` when using inline emoji. */
export type QuizStickerVisual = {
  label: string;
  emoji: string;
  rarity: StickerRarity;
};

/** A1-friendly lemmas → emoji when no sticker label matches well enough. */
const WORD_TO_EMOJI: Record<string, string> = {
  apple: "🍎",
  baby: "👶",
  bag: "🎒",
  ball: "⚽",
  banana: "🍌",
  bear: "🐻",
  bed: "🛏️",
  bee: "🐝",
  bell: "🔔",
  bicycle: "🚲",
  bike: "🚲",
  bird: "🐦",
  book: "📘",
  bread: "🍞",
  breakfast: "🥣",
  brush: "🪥",
  bus: "🚌",
  butterfly: "🦋",
  cake: "🎂",
  car: "🚗",
  carrot: "🥕",
  cat: "🐱",
  chair: "🪑",
  chicken: "🐔",
  classroom: "🏫",
  clock: "🕐",
  cloud: "☁️",
  cold: "🥶",
  cookie: "🍪",
  cow: "🐮",
  cup: "☕",
  day: "📅",
  desk: "🪑",
  dinner: "🍽️",
  dog: "🐶",
  doll: "🎎",
  door: "🚪",
  drink: "🥤",
  duck: "🦆",
  egg: "🥚",
  elephant: "🐘",
  family: "👨‍👩‍👧",
  fish: "🐠",
  flower: "🌸",
  food: "🍽️",
  fox: "🦊",
  frog: "🐸",
  fruit: "🍇",
  gift: "🎁",
  giraffe: "🦒",
  grape: "🍇",
  happy: "😊",
  hat: "🎩",
  home: "🏠",
  horse: "🐴",
  hot: "🌡️",
  house: "🏠",
  hungry: "🤤",
  ice: "🧊",
  juice: "🧃",
  jump: "🦘",
  kite: "🪁",
  lion: "🦁",
  lunch: "🥪",
  milk: "🥛",
  monkey: "🐵",
  moon: "🌙",
  mouse: "🐭",
  orange: "🍊",
  panda: "🐼",
  pen: "🖊️",
  pencil: "✏️",
  penguin: "🐧",
  pig: "🐷",
  pizza: "🍕",
  play: "🎮",
  rain: "🌧️",
  rainy: "🌧️",
  read: "📖",
  rice: "🍚",
  run: "🏃",
  school: "🏫",
  sheep: "🐑",
  shirt: "👕",
  shoe: "👟",
  shoes: "👟",
  sister: "👧",
  sleep: "😴",
  snake: "🐍",
  snow: "❄️",
  snowy: "❄️",
  sock: "🧦",
  star: "⭐",
  student: "🧑‍🎓",
  sun: "☀️",
  sunny: "☀️",
  sweater: "🧥",
  swim: "🏊",
  table: "🪑",
  teacher: "🧑‍🏫",
  tiger: "🐯",
  today: "📆",
  tomato: "🍅",
  toy: "🧸",
  train: "🚆",
  tree: "🌲",
  turtle: "🐢",
  walk: "🚶",
  water: "💧",
  weather: "🌤️",
  wind: "💨",
  window: "🪟",
  wolf: "🐺",
  yarn: "🧶",
  zebra: "🦓",
  zoo: "🦒",
};

const MIN_STICKER_SCORE = 28;

/** Weak tokens like "the" falsely match sticker labels (e.g. Theater). */
const WEAK_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "you",
  "are",
  "was",
  "word",
  "words",
  "spell",
  "put",
  "order",
  "letters",
  "choose",
  "pick",
  "fits",
  "fill",
  "blank",
  "blanks",
  "today",
  "question",
  "sentence",
  "read",
  "write",
  "say",
  "one",
  "two",
  "how",
  "what",
  "when",
  "where",
  "who",
  "can",
  "not",
  "its",
  "our",
  "his",
  "her",
  "they",
  "them",
  "have",
  "has",
  "had",
  "does",
  "did",
  "will",
  "just",
  "very",
  "about",
  "each",
  "every",
  "other",
  "some",
  "many",
  "much",
  "more",
  "most",
  "than",
  "then",
  "here",
  "there",
  "where",
  "which",
  "their",
]);

function tieBreakKey(seed: string, index: number, stickerId: string): string {
  let h = 2166136261;
  const s = `${seed}\0${index}\0${stickerId}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function letterRuns(s: string): string[] {
  return s.toLowerCase().match(/[a-z]+/g) ?? [];
}

function lemmaVariants(w: string): string[] {
  const t = w.toLowerCase().trim();
  if (t.length < 2) return [];
  const out = new Set<string>([t]);
  if (t.length > 2 && t.endsWith("s") && !t.endsWith("ss")) out.add(t.slice(0, -1));
  if (t.endsWith("ies") && t.length > 4) out.add(t.slice(0, -3) + "y");
  if (t.endsWith("ing") && t.length > 4) out.add(t.slice(0, -3));
  return [...out];
}

function matchStickerTerm(sticker: StickerDef, term: string): number {
  const t = term.toLowerCase();
  if (t.length < 2) return 0;
  const label = sticker.label.toLowerCase();
  const tokens = label.split(/[^a-z]+/).filter((x) => x.length >= 2);
  if (label.includes(t)) return 100;
  for (const tok of tokens) {
    if (tok === t) return 120;
    if (tok.length >= 3 && t.length >= 3 && (tok.startsWith(t) || t.startsWith(tok))) return 72;
    if (tok.includes(t) || t.includes(tok)) return 45;
  }
  return 0;
}

function bestLibrarySticker(weighted: { term: string; w: number }[], seed: string, index: number): StickerDef | null {
  let best: StickerDef | null = null;
  let bestScore = 0;
  let bestTie = "\uffff";

  for (const sticker of STICKER_LIBRARY) {
    let score = 0;
    for (const { term, w } of weighted) {
      score += w * matchStickerTerm(sticker, term);
    }
    if (score < bestScore) continue;
    const tie = tieBreakKey(seed, index, sticker.id);
    if (score > bestScore || (score === bestScore && tie < bestTie)) {
      bestScore = score;
      best = sticker;
      bestTie = tie;
    }
  }

  if (bestScore < MIN_STICKER_SCORE) return null;
  return best;
}

function collectWeightedTerms(q: TestStartQuizQuestion): { strong: string[]; weak: string[] } {
  const strong = new Set<string>();
  const weak = new Set<string>();

  const addStrong = (s: string) => {
    for (const v of lemmaVariants(s)) {
      if (v.length >= 2 && !/^\d+$/.test(v)) strong.add(v);
    }
  };
  const addWeak = (s: string) => {
    for (const w of letterRuns(s)) {
      if (w.length >= 3 && !WEAK_STOPWORDS.has(w)) weak.add(w);
    }
  };

  if (q.subtype === "letter_mixup") {
    const tw = q.items[0]?.target_word?.trim() ?? "";
    addStrong(tw);
    addWeak(q.prompt ?? "");
  } else if (q.subtype === "fill_blanks") {
    for (const b of q.blanks) {
      for (const a of b.acceptable) addStrong(a);
    }
    if (q.word_bank) {
      for (const wb of q.word_bank) addStrong(wb);
    }
    addWeak(q.template.replace(/__\d+__/g, " "));
    if (q.body_text) addWeak(q.body_text);
  } else if (q.subtype === "mc_quiz") {
    const correct = q.options.find((o) => o.id === q.correct_option_id);
    if (correct?.label) {
      addStrong(correct.label);
      addWeak(correct.label);
    }
    addWeak(q.question);
    for (const o of q.options) addWeak(o.label);
  }

  for (const s of strong) weak.delete(s);
  return { strong: [...strong], weak: [...weak] };
}

function inlineEmojiForTerms(terms: string[]): QuizStickerVisual | null {
  for (const raw of terms) {
    for (const v of lemmaVariants(raw)) {
      const emoji = WORD_TO_EMOJI[v];
      if (emoji) {
        const pretty =
          v.length <= 1 ? v.toUpperCase() : v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
        return { emoji, label: pretty, rarity: "common" };
      }
    }
  }
  return null;
}

/**
 * Sticker-book styling: prefer a real sticker whose **name** matches the answer / prompt;
 * else a curated **word → emoji** for the target lemma; else deterministic random sticker.
 */
export function pickQuizStickerVisual(q: TestStartQuizQuestion, seed: string, index: number): QuizStickerVisual {
  const { strong, weak } = collectWeightedTerms(q);
  const weighted: { term: string; w: number }[] = [
    ...strong.map((term) => ({ term, w: 1 })),
    ...weak.map((term) => ({ term, w: 0.32 })),
  ];

  const fromLib = bestLibrarySticker(weighted, seed, index);
  if (fromLib) {
    return { label: fromLib.label, emoji: fromLib.emoji, rarity: fromLib.rarity };
  }

  const inline = inlineEmojiForTerms([...strong, ...weak]);
  if (inline) return inline;

  const fb = pickStickerForQuizFallback(seed, index);
  return { label: fb.label, emoji: fb.emoji, rarity: fb.rarity };
}
