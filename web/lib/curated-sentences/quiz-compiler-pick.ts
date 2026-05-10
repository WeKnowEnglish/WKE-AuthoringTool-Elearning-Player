/**
 * Difficulty-weighted row selection for test-start quizzes.
 */

import { seededRandom } from "./quiz-compiler-builders";
import { normalizeLemmaKey } from "./quiz-compiler-loader";
import type { IndexedSentenceRow, QuizDifficultyLevel, QuizQuestionCount } from "./quiz-compiler-types";

const WEIGHT_BY_QUIZ_LEVEL: Record<
  QuizDifficultyLevel,
  Record<QuizDifficultyLevel, number>
> = {
  1: { 1: 0.62, 2: 0.28, 3: 0.1 },
  2: { 1: 0.22, 2: 0.56, 3: 0.22 },
  3: { 1: 0.07, 2: 0.28, 3: 0.65 },
};

export function effectiveQuizDifficulty(row: IndexedSentenceRow): QuizDifficultyLevel {
  const d = row.difficulty ?? row.vocabulary?.difficulty;
  if (d === 1 || d === 2 || d === 3) return d;
  return 2;
}

export function rowIdentity(row: IndexedSentenceRow): string {
  return `${row.rowIndex}\0${row.lemmaKey}\0${row.target_word}`;
}

/** Normalized sentence text for cross-question de-duplication. */
export function normalizeRowSentenceKey(row: IndexedSentenceRow): string {
  return row.sentence.trim().toLowerCase().replace(/\s+/g, " ");
}

export type PickRowsVarietySeeds = {
  sentenceKeys: ReadonlySet<string>;
  lemmaKeys: ReadonlySet<string>;
  /** Non-empty `variant_group` ids already used (at most one row per group per quiz when strict). */
  variantGroupKeys: ReadonlySet<string>;
};

export type PickRowsOptions = {
  /** Sentences / target lemmas already used (e.g. letter-mixup picks). */
  varietySeeds?: PickRowsVarietySeeds;
  /**
   * When true (default), no two picked rows share the same normalized sentence or target lemma.
   * When false, only `rowIdentity` is unique within this call (used to pad when the pool is tight).
   */
  dedupeSentenceAndLemma?: boolean;
};

export function varietySetsFromRows(rows: IndexedSentenceRow[]): PickRowsVarietySeeds {
  const sentenceKeys = new Set<string>();
  const lemmaKeys = new Set<string>();
  const variantGroupKeys = new Set<string>();
  for (const r of rows) {
    sentenceKeys.add(normalizeRowSentenceKey(r));
    const lk = normalizeLemmaKey(r.target_word);
    if (lk) lemmaKeys.add(lk);
    const vg = String(r.variant_group ?? "").trim();
    if (vg) variantGroupKeys.add(vg);
  }
  return { sentenceKeys, lemmaKeys, variantGroupKeys };
}

export function rowViolatesVarietySeeds(row: IndexedSentenceRow, seeds: PickRowsVarietySeeds): boolean {
  if (seeds.sentenceKeys.has(normalizeRowSentenceKey(row))) return true;
  const lk = normalizeLemmaKey(row.target_word);
  if (lk && seeds.lemmaKeys.has(lk)) return true;
  const vg = String(row.variant_group ?? "").trim();
  if (vg && seeds.variantGroupKeys.has(vg)) return true;
  return false;
}

function cloneSeeds(
  seeds: PickRowsVarietySeeds | undefined,
): { sentences: Set<string>; lemmas: Set<string>; variantGroups: Set<string> } {
  return {
    sentences: new Set(seeds?.sentenceKeys ?? []),
    lemmas: new Set(seeds?.lemmaKeys ?? []),
    variantGroups: new Set(seeds?.variantGroupKeys ?? []),
  };
}

function rowFitsVariety(
  row: IndexedSentenceRow,
  taken: Set<string>,
  sentences: Set<string>,
  lemmas: Set<string>,
  variantGroups: Set<string>,
  strictVariety: boolean,
): boolean {
  const id = rowIdentity(row);
  if (taken.has(id)) return false;
  if (!strictVariety) return true;
  if (sentences.has(normalizeRowSentenceKey(row))) return false;
  const lk = normalizeLemmaKey(row.target_word);
  if (lk && lemmas.has(lk)) return false;
  const vg = String(row.variant_group ?? "").trim();
  if (vg && variantGroups.has(vg)) return false;
  return true;
}

function commitRow(
  row: IndexedSentenceRow,
  taken: Set<string>,
  sentences: Set<string>,
  lemmas: Set<string>,
  variantGroups: Set<string>,
  out: IndexedSentenceRow[],
  strictVariety: boolean,
): void {
  taken.add(rowIdentity(row));
  if (strictVariety) {
    sentences.add(normalizeRowSentenceKey(row));
    const lk = normalizeLemmaKey(row.target_word);
    if (lk) lemmas.add(lk);
    const vg = String(row.variant_group ?? "").trim();
    if (vg) variantGroups.add(vg);
  }
  out.push(row);
}

export function countSubtypesForQuiz(questionCount: QuizQuestionCount): {
  mcq: number;
  fill: number;
  letter: number;
} {
  let mcq = 0;
  let fill = 0;
  let letter = 0;
  for (let i = 0; i < questionCount; i += 1) {
    const k = i % 3;
    if (k === 0) mcq += 1;
    else if (k === 1) fill += 1;
    else letter += 1;
  }
  return { mcq, fill, letter };
}

export function pickRowsDifficultyWeighted(
  pool: IndexedSentenceRow[],
  n: number,
  quizLevel: QuizDifficultyLevel,
  seed: string,
  options?: PickRowsOptions,
): IndexedSentenceRow[] {
  if (n <= 0 || pool.length === 0) return [];

  const strictVariety = options?.dedupeSentenceAndLemma !== false;
  const rand = seededRandom(`${seed}:w:${quizLevel}`);
  const dist = WEIGHT_BY_QUIZ_LEVEL[quizLevel];
  const remaining = [...pool];
  const out: IndexedSentenceRow[] = [];
  const taken = new Set<string>();
  const { sentences: usedSentences, lemmas: usedLemmas, variantGroups: usedVariantGroups } = cloneSeeds(
    options?.varietySeeds,
  );

  for (let i = 0; i < n && remaining.length > 0; i += 1) {
    const eligible = remaining.filter((r) =>
      rowFitsVariety(r, taken, usedSentences, usedLemmas, usedVariantGroups, strictVariety),
    );
    if (eligible.length === 0) break;
    const weights = eligible.map((r) => dist[effectiveQuizDifficulty(r)]);
    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum <= 0) break;
    let roll = rand() * sum;
    let pickIdx = 0;
    for (let j = 0; j < weights.length; j += 1) {
      roll -= weights[j];
      if (roll <= 0) {
        pickIdx = j;
        break;
      }
      pickIdx = j;
    }
    const chosen = eligible[pickIdx]!;
    const remIdx = remaining.indexOf(chosen);
    if (remIdx >= 0) remaining.splice(remIdx, 1);
    commitRow(chosen, taken, usedSentences, usedLemmas, usedVariantGroups, out, strictVariety);
  }

  const backfillPool = pool.filter((r) =>
    rowFitsVariety(r, taken, usedSentences, usedLemmas, usedVariantGroups, strictVariety),
  );
  shuffleInPlace(backfillPool, rand);
  for (const r of backfillPool) {
    if (out.length >= n) break;
    commitRow(r, taken, usedSentences, usedLemmas, usedVariantGroups, out, strictVariety);
  }

  return out.slice(0, n);
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
