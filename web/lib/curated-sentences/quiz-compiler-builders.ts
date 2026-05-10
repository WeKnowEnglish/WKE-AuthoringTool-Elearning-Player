/**
 * Build raw interaction payloads from indexed sentence rows.
 */

import type { VocabularyEntry } from "./master-vocabulary";
import { normalizeLemmaKey } from "./quiz-compiler-loader";
import { vocabEntryMatchesTopic } from "./quiz-compiler-filters";
import type { IndexedSentenceRow, QuizTopicId } from "./quiz-compiler-types";

export function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function findTargetSurface(sentence: string, target: string): { start: number; surface: string } | null {
  if (!target || !sentence) return null;
  const lower = sentence.toLowerCase();
  const t = target.toLowerCase();
  const idx = lower.indexOf(t);
  if (idx < 0) return null;
  return { start: idx, surface: sentence.slice(idx, idx + target.length) };
}

function collectDistractorLabels(
  topic: QuizTopicId,
  entries: VocabularyEntry[],
  exclude: Set<string>,
  need: number,
  rand: () => number,
): string[] {
  const pool = entries
    .filter((e) => vocabEntryMatchesTopic(e, topic) && !exclude.has(normalizeLemmaKey(e.lemma)))
    .map((e) => e.forms.base || e.lemma);
  shuffleInPlace(pool, rand);
  return pool.slice(0, need);
}

function applyOptionalImage(raw: Record<string, unknown>, imageUrl: string | null | undefined) {
  if (imageUrl) {
    raw.image_url = imageUrl;
    raw.image_fit = "contain";
  }
}

/** MCQ: masked sentence + 4 options (target surface + variants / vocabulary). */
export function buildMcQuizPayload(
  row: IndexedSentenceRow,
  topic: QuizTopicId,
  entries: VocabularyEntry[],
  seed: string,
  imageUrl?: string | null,
): Record<string, unknown> {
  const rand = seededRandom(`${seed}:mcq`);
  const found = findTargetSurface(row.sentence, row.target_word);
  if (!found) throw new Error("MCQ: target not found in sentence");

  const surface = found.surface;
  const masked =
    row.sentence.slice(0, found.start) + "________" + row.sentence.slice(found.start + surface.length);

  const exclude = new Set<string>([normalizeLemmaKey(surface)]);
  const optionLabels: string[] = [surface];

  for (const v of row.variant_lexemes) {
    if (optionLabels.length >= 4) break;
    const vn = normalizeLemmaKey(v);
    if (!vn || exclude.has(vn)) continue;
    exclude.add(vn);
    optionLabels.push(v);
  }

  if (optionLabels.length < 4) {
    const more = collectDistractorLabels(topic, entries, exclude, 8, rand);
    for (const m of more) {
      if (optionLabels.length >= 4) break;
      const mn = normalizeLemmaKey(m);
      if (exclude.has(mn)) continue;
      exclude.add(mn);
      optionLabels.push(m);
    }
  }

  while (optionLabels.length < 4) {
    const extra = collectDistractorLabels(topic, entries, exclude, 1, rand)[0] ?? "word";
    exclude.add(normalizeLemmaKey(extra));
    optionLabels.push(extra);
  }

  const labels = optionLabels.slice(0, 4);
  shuffleInPlace(labels, rand);

  const ids = ["a", "b", "c", "d"] as const;
  const options = labels.map((label, i) => ({ id: ids[i], label }));
  const correct = options.find((o) => normalizeLemmaKey(o.label) === normalizeLemmaKey(surface));
  const correct_option_id = correct?.id ?? "a";

  const raw: Record<string, unknown> = {
    type: "interaction",
    subtype: "mc_quiz",
    question: `Choose the word that fits: ${masked}`,
    options,
    correct_option_id,
    shuffle_options: false,
  };
  applyOptionalImage(raw, imageUrl);
  return raw;
}

/** Single blank; acceptable answers from CSV + vocabulary + surface form; word_bank = surface + topic distractors. */
export function buildFillBlanksPayload(
  row: IndexedSentenceRow,
  topic: QuizTopicId,
  entries: VocabularyEntry[],
  seed: string,
  imageUrl?: string | null,
): Record<string, unknown> {
  const rand = seededRandom(`${seed}:fill-blanks-bank`);
  const found = findTargetSurface(row.sentence, row.target_word);
  if (!found) throw new Error("Fill-blank: target not found in sentence");

  const template =
    row.sentence.slice(0, found.start) + "__1__" + row.sentence.slice(found.start + found.surface.length);

  const acceptable: string[] = [];
  const seen = new Set<string>();
  function add(s: string) {
    const t = s.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    acceptable.push(t);
  }

  add(found.surface);
  for (const a of row.acceptable_targets) add(a);
  for (const a of row.vocabulary?.acceptable_typed_answers ?? []) add(a);

  const excludeForBank = new Set<string>();
  for (const a of acceptable) excludeForBank.add(normalizeLemmaKey(a));

  const word_bank: string[] = [found.surface];
  while (word_bank.length < 4) {
    const more = collectDistractorLabels(topic, entries, excludeForBank, 8, rand);
    let added = false;
    for (const m of more) {
      if (word_bank.length >= 4) break;
      const mn = normalizeLemmaKey(m);
      if (excludeForBank.has(mn)) continue;
      excludeForBank.add(mn);
      word_bank.push(m);
      added = true;
    }
    if (!added) {
      const fallback = `word${word_bank.length}`;
      excludeForBank.add(normalizeLemmaKey(fallback));
      word_bank.push(fallback);
    }
  }
  shuffleInPlace(word_bank, rand);

  const raw: Record<string, unknown> = {
    type: "interaction",
    subtype: "fill_blanks",
    template,
    blanks: [{ id: "1", acceptable: acceptable.length > 0 ? acceptable : [found.surface] }],
    word_bank,
  };
  applyOptionalImage(raw, imageUrl);
  return raw;
}

function pickLetterMixupWord(row: IndexedSentenceRow): { target_word: string; accepted_words: string[] } {
  const found = findTargetSurface(row.sentence, row.target_word);
  const surface = found?.surface ?? row.target_word;
  const lettersOnly = /^[a-zA-Z]+$/.test(surface);
  let word = surface;
  if (!lettersOnly && row.vocabulary?.forms.base && /^[a-zA-Z]+$/.test(row.vocabulary.forms.base)) {
    word = row.vocabulary.forms.base;
  }
  if (word.length < 3 || word.length > 12) {
    if (row.vocabulary?.forms.base && row.vocabulary.forms.base.length >= 3 && row.vocabulary.forms.base.length <= 12) {
      word = row.vocabulary.forms.base;
    }
  }
  if (word.length < 3) {
    throw new Error("Letter mix-up: word too short");
  }
  if (word.length > 12) {
    word = word.slice(0, 12);
  }

  const accepted = new Set<string>([word, word.toLowerCase(), word[0].toUpperCase() + word.slice(1).toLowerCase()]);
  for (const a of row.vocabulary?.acceptable_typed_answers ?? []) {
    if (/^[a-zA-Z]+$/.test(a) && a.length === word.length) accepted.add(a);
  }
  return { target_word: word.toLowerCase(), accepted_words: [...accepted] };
}

export function buildLetterMixupPayload(row: IndexedSentenceRow, imageUrl?: string | null): Record<string, unknown> {
  const { target_word, accepted_words } = pickLetterMixupWord(row);
  const raw: Record<string, unknown> = {
    type: "interaction",
    subtype: "letter_mixup",
    prompt: "Put the letters in order to spell the word.",
    shuffle_letters: true,
    case_sensitive: false,
    items: [{ id: "lm1", target_word, accepted_words }],
  };
  applyOptionalImage(raw, imageUrl);
  return raw;
}

export function rowUsableForLetterMixup(row: IndexedSentenceRow): boolean {
  if (!row.target_word || !row.sentence) return false;
  if (!row.sentence.toLowerCase().includes(row.target_word.toLowerCase())) return false;
  try {
    pickLetterMixupWord(row);
    return true;
  } catch {
    return false;
  }
}

export function pickActivityRows(pool: IndexedSentenceRow[], seed: string): {
  mcq: IndexedSentenceRow;
  fill: IndexedSentenceRow;
  letter: IndexedSentenceRow;
} {
  const rand = seededRandom(`${seed}:activities`);
  const shuffled = [...pool];
  shuffleInPlace(shuffled, rand);
  if (shuffled.length === 0) {
    throw new Error("pickActivityRows: empty pool");
  }
  const mcq = shuffled[0];
  const fill = shuffled[Math.min(1, shuffled.length - 1)];
  const letterCandidates = shuffled.filter(rowUsableForLetterMixup);
  const letter =
    letterCandidates[0] ?? shuffled[Math.min(2, shuffled.length - 1)];
  return { mcq, fill, letter };
}
