/**
 * Orchestrates sentence-bank loading, filtering, builders, and schema validation for /teststartpage.
 */

import { parseScreenPayload, type ScreenPayload } from "@/lib/lesson-schemas-player";
import {
  buildFillBlanksPayload,
  buildLetterMixupPayload,
  buildMcQuizPayload,
  rowUsableForLetterMixup,
} from "./quiz-compiler-builders";
import {
  pickCandidatesWithFallback,
  rowMatchesTopic,
  rowUsableForQuestion,
  vocabEntryMatchesTopic,
} from "./quiz-compiler-filters";
import { buildLemmaAliasMap, indexSentenceRows, normalizeJsonRows } from "./quiz-compiler-index";
import { normalizeLemmaKey } from "./quiz-compiler-loader";
import {
  countSubtypesForQuiz,
  pickRowsDifficultyWeighted,
  rowIdentity,
  rowViolatesVarietySeeds,
  varietySetsFromRows,
} from "./quiz-compiler-pick";
import type { IndexedSentenceRow, QuizBuildOptions, QuizCompilerDebug, QuizTopicId } from "./quiz-compiler-types";
import { DEFAULT_QUIZ_BUILD_OPTIONS } from "./quiz-compiler-types";
import type { VocabularyEntry } from "./master-vocabulary";
import { MASTER_VOCABULARY } from "./master-vocabulary";
import { SENTENCE_BANK_ROWS_RAW } from "./sentence-bank-data";

export type TestStartQuizQuestion =
  | Extract<ScreenPayload, { type: "interaction"; subtype: "mc_quiz" }>
  | Extract<ScreenPayload, { type: "interaction"; subtype: "fill_blanks" }>
  | Extract<ScreenPayload, { type: "interaction"; subtype: "letter_mixup" }>;

export type QuizSlideSubtype = "mc_quiz" | "fill_blanks" | "letter_mixup";

export type QuizCompilationSlide = {
  subtype: QuizSlideSubtype;
  row: IndexedSentenceRow;
  raw: Record<string, unknown>;
};

export type QuizCompilationState = {
  slides: QuizCompilationSlide[];
  debug: QuizCompilerDebug;
};

let cachedIndexed: IndexedSentenceRow[] | null = null;

export function getIndexedRowsForQuizCompiler(): IndexedSentenceRow[] {
  if (!cachedIndexed) {
    const normalized = normalizeJsonRows(SENTENCE_BANK_ROWS_RAW);
    const map = buildLemmaAliasMap(MASTER_VOCABULARY.entries);
    cachedIndexed = indexSentenceRows(normalized, map);
  }
  return cachedIndexed;
}

function mustParseInteraction(raw: unknown): Extract<ScreenPayload, { type: "interaction" }> {
  const parsed = parseScreenPayload("interaction", raw);
  if (!parsed || parsed.type !== "interaction") {
    throw new Error("Invalid interaction payload from quiz compiler");
  }
  return parsed;
}

function defaultSeed(topicId: QuizTopicId): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${topicId}:${y}-${m}-${day}`;
}

function dedupeRows(rows: IndexedSentenceRow[]): IndexedSentenceRow[] {
  const seen = new Set<string>();
  const out: IndexedSentenceRow[] = [];
  for (const r of rows) {
    const id = rowIdentity(r);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

function dedupeLetterPool(rows: IndexedSentenceRow[]): IndexedSentenceRow[] {
  const seen = new Set<string>();
  const out: IndexedSentenceRow[] = [];
  for (const r of rows) {
    if (!rowUsableForLetterMixup(r)) continue;
    const id = rowIdentity(r);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
}

const SYNTHETIC_LETTER_MIXUP_CAP = 120;

/**
 * Topic-matched vocabulary entries as minimal sentence rows so letter_mixup always has a pool
 * when the bank has few spellable targets for that menu topic.
 */
export function buildSyntheticLetterMixupIndexedRows(
  topicId: QuizTopicId,
  allEntries: VocabularyEntry[],
): IndexedSentenceRow[] {
  const out: IndexedSentenceRow[] = [];
  for (const e of allEntries) {
    if (out.length >= SYNTHETIC_LETTER_MIXUP_CAP) break;
    if (!vocabEntryMatchesTopic(e, topicId)) continue;

    const base = String(e.forms?.base ?? e.lemma ?? "").trim();
    if (!/^[a-zA-Z]+$/.test(base) || base.length < 3 || base.length > 12) continue;

    const ex = e.example_sentence?.trim();
    let sentence: string;
    let target_word: string;

    if (ex) {
      const low = ex.toLowerCase();
      if (low.includes(base.toLowerCase())) {
        sentence = ex;
        target_word = base;
      } else {
        const lemma = e.lemma.trim();
        if (
          /^[a-zA-Z]+$/.test(lemma) &&
          lemma.length >= 3 &&
          lemma.length <= 12 &&
          low.includes(lemma.toLowerCase())
        ) {
          sentence = ex;
          target_word = lemma;
        } else {
          sentence = `The word is ${base}.`;
          target_word = base;
        }
      }
    } else {
      sentence = `The word is ${base}.`;
      target_word = base;
    }

    const row: IndexedSentenceRow = {
      sentence,
      target_word,
      acceptable_targets: [],
      variant_lexemes: [],
      structure_id: "synthetic_letter_mixup",
      tags: ["synthetic", "letter_mixup"],
      cefr: e.cefr,
      difficulty: e.difficulty,
      variant_group: "",
      rowIndex: -4000 - out.length,
      lemmaKey: normalizeLemmaKey(target_word),
      vocabulary: e,
    };

    if (!rowUsableForLetterMixup(row)) continue;
    out.push(row);
  }
  return out;
}

function widenLetterPool(
  topicId: QuizTopicId,
  pool: IndexedSentenceRow[],
  indexed: IndexedSentenceRow[],
  minSize: number,
  syntheticLetterRows: IndexedSentenceRow[],
): IndexedSentenceRow[] {
  const fromBank = dedupeLetterPool([
    ...pool.filter(rowUsableForLetterMixup),
    ...indexed.filter((r) => rowMatchesTopic(r, topicId) && rowUsableForLetterMixup(r)),
  ]);
  if (fromBank.length >= minSize) return fromBank;

  const bankTargets = new Set(fromBank.map((r) => normalizeLemmaKey(r.target_word)));
  const extra = syntheticLetterRows.filter((r) => !bankTargets.has(normalizeLemmaKey(r.target_word)));
  return dedupeLetterPool([...fromBank, ...extra]);
}

function findLetterMixupRow(
  topicId: QuizTopicId,
  pool: IndexedSentenceRow[],
  indexed: IndexedSentenceRow[],
  exclude: Set<string>,
  syntheticLetterRows: IndexedSentenceRow[],
): { row: IndexedSentenceRow; letterFallbackNote?: string } | null {
  const tryTake = (rows: IndexedSentenceRow[], note?: string) => {
    for (const r of rows) {
      if (!rowUsableForLetterMixup(r)) continue;
      const id = rowIdentity(r);
      if (exclude.has(id)) continue;
      return { row: r, letterFallbackNote: note };
    }
    return null;
  };

  const inPool = tryTake(pool.filter(rowUsableForLetterMixup));
  if (inPool) return inPool;

  const onTopic = tryTake(
    indexed.filter((r) => rowMatchesTopic(r, topicId) && rowUsableForLetterMixup(r)),
    "letter_mixup: used an on-topic row outside the tier pool.",
  );
  if (onTopic) return onTopic;

  const fromVocab = tryTake(
    syntheticLetterRows,
    "letter_mixup: used a vocabulary-derived on-topic spelling row.",
  );
  if (fromVocab) return fromVocab;

  const any = tryTake(indexed.filter(rowUsableForLetterMixup), "letter_mixup: used any playable row in bank.");
  return any;
}

function buildLetterRawOrFallback(
  topicId: QuizTopicId,
  pool: IndexedSentenceRow[],
  indexed: IndexedSentenceRow[],
  row: IndexedSentenceRow,
  exclude: Set<string>,
  warnings: string[],
  syntheticLetterRows: IndexedSentenceRow[],
): { raw: Record<string, unknown>; row: IndexedSentenceRow } {
  try {
    return { raw: buildLetterMixupPayload(row), row };
  } catch {
    const ex = new Set(exclude);
    ex.add(rowIdentity(row));
    const fb = findLetterMixupRow(topicId, pool, indexed, ex, syntheticLetterRows);
    if (!fb) {
      throw new Error(`Could not build letter_mixup for topic "${topicId}" (no playable rows)`);
    }
    if (fb.letterFallbackNote && !warnings.includes(fb.letterFallbackNote)) {
      warnings.push(fb.letterFallbackNote);
    }
    return { raw: buildLetterMixupPayload(fb.row), row: fb.row };
  }
}

/**
 * Build raw payloads + row picks (no parsing). Use `finalizeQuizCompilation` or `runQuizCompiler`.
 */
export function buildQuizCompilation(
  topicId: QuizTopicId,
  seed?: string,
  buildOptions?: Partial<QuizBuildOptions>,
): QuizCompilationState {
  const opts: QuizBuildOptions = { ...DEFAULT_QUIZ_BUILD_OPTIONS, ...buildOptions };
  const questionCount = opts.questionCount;
  const difficultyLevel = opts.difficultyLevel;

  const indexed = getIndexedRowsForQuizCompiler();
  const minPool = Math.max(3, questionCount);
  const { rows: pool, tier, warnings } = pickCandidatesWithFallback(
    indexed,
    topicId,
    MASTER_VOCABULARY.entries,
    minPool,
  );

  if (pool.length === 0) {
    throw new Error(`No sentence bank rows available for topic "${topicId}"`);
  }

  const effectiveSeed = seed ?? defaultSeed(topicId);
  const { mcq: nMcq, fill: nFill, letter: nLetter } = countSubtypesForQuiz(questionCount);

  const syntheticLetterRows = buildSyntheticLetterMixupIndexedRows(topicId, MASTER_VOCABULARY.entries);
  const letterPoolMin = Math.max(nLetter * 2, 10);
  const letterPool = widenLetterPool(topicId, pool, indexed, letterPoolMin, syntheticLetterRows);
  const letterPicked = pickRowsDifficultyWeighted(
    letterPool,
    nLetter,
    difficultyLevel,
    `${effectiveSeed}:letter`,
  );

  const letterIds = new Set(letterPicked.map(rowIdentity));
  const mcFillBase = pool.filter((r) => rowUsableForQuestion(r) && !letterIds.has(rowIdentity(r)));
  /** Tier pool first, then any other on-topic row — never off-topic bank rows (keeps MC/fill aligned with topic distractors). */
  const mcFillWidened = dedupeRows([
    ...mcFillBase,
    ...indexed.filter((r) => rowMatchesTopic(r, topicId) && rowUsableForQuestion(r) && !letterIds.has(rowIdentity(r))),
  ]).filter((r) => rowUsableForQuestion(r));

  const needText = nMcq + nFill;
  /** Vocabulary-only spelling rows must not block MCQ/fill lemmas (they exist only for letter_mixup). */
  const letterRowsForVarietySeeds = letterPicked.filter((r) => r.rowIndex >= 0);
  let textPicked = pickRowsDifficultyWeighted(mcFillWidened, needText, difficultyLevel, `${effectiveSeed}:text`, {
    varietySeeds: varietySetsFromRows(letterRowsForVarietySeeds),
  });

  if (textPicked.length < needText) {
    const usedTextIds = new Set(textPicked.map(rowIdentity));
    const letterSeeds = varietySetsFromRows(letterRowsForVarietySeeds);
    const poolPad = mcFillWidened.filter((r) => {
      if (letterIds.has(rowIdentity(r)) || usedTextIds.has(rowIdentity(r))) return false;
      return !rowViolatesVarietySeeds(r, letterSeeds);
    });
    const pad = pickRowsDifficultyWeighted(
      poolPad,
      needText - textPicked.length,
      difficultyLevel,
      `${effectiveSeed}:text-pad`,
      { dedupeSentenceAndLemma: false },
    );
    textPicked = [...textPicked, ...pad];
    if (pad.length > 0) {
      warnings.push(
        `Quiz text picks: padded ${pad.length} row(s) with identity-only dedupe (tight variety pool for topic).`,
      );
    }
  }

  if (textPicked.length < needText) {
    const usedTextIds = new Set(textPicked.map(rowIdentity));
    const combinedSeeds = varietySetsFromRows([...letterRowsForVarietySeeds, ...textPicked]);
    const poolLoose = mcFillWidened.filter(
      (r) =>
        !letterIds.has(rowIdentity(r)) &&
        !usedTextIds.has(rowIdentity(r)) &&
        !rowViolatesVarietySeeds(r, combinedSeeds),
    );
    const padLoose = pickRowsDifficultyWeighted(
      poolLoose,
      needText - textPicked.length,
      difficultyLevel,
      `${effectiveSeed}:text-pad-loose`,
      { dedupeSentenceAndLemma: false },
    );
    textPicked = [...textPicked, ...padLoose];
    if (padLoose.length > 0) {
      warnings.push(`Quiz text picks: topped up ${padLoose.length} row(s) after shortfall.`);
    }
  }

  if (textPicked.length < needText) {
    const usedIds = new Set<string>([...textPicked.map(rowIdentity), ...letterIds]);
    const fillerPool = indexed.filter(
      (r) =>
        rowMatchesTopic(r, topicId) &&
        rowUsableForQuestion(r) &&
        !usedIds.has(rowIdentity(r)),
    );
    const before = textPicked.length;
    for (const r of fillerPool) {
      if (textPicked.length >= needText) break;
      textPicked.push(r);
      usedIds.add(rowIdentity(r));
    }
    if (textPicked.length < needText) {
      throw new Error(
        `Topic "${topicId}": need ${needText} MC/fill rows but only found ${textPicked.length} on-topic usable rows.`,
      );
    }
    if (textPicked.length > before) {
      warnings.push(
        `Quiz text picks: filled ${textPicked.length - before} row(s) without variety filtering (tight topic pool).`,
      );
    }
  }

  const subtypes: QuizSlideSubtype[] = Array.from({ length: questionCount }, (_, i) => {
    const k = i % 3;
    if (k === 0) return "mc_quiz";
    if (k === 1) return "fill_blanks";
    return "letter_mixup";
  });

  let mcIdx = 0;
  let fillIdx = 0;
  let letterIdx = 0;
  const debugWarnings = [...warnings];
  const slides: QuizCompilationSlide[] = [];
  const usedLetter = new Set<string>();

  for (let i = 0; i < questionCount; i += 1) {
    const subtype = subtypes[i]!;
    const seedSuffix = `${effectiveSeed}:q${i}`;

    if (subtype === "mc_quiz") {
      const row = textPicked[mcIdx]!;
      mcIdx += 1;
      slides.push({
        subtype,
        row,
        raw: buildMcQuizPayload(row, topicId, MASTER_VOCABULARY.entries, seedSuffix),
      });
    } else if (subtype === "fill_blanks") {
      const row = textPicked[nMcq + fillIdx]!;
      fillIdx += 1;
      slides.push({
        subtype,
        row,
        raw: buildFillBlanksPayload(row, topicId, MASTER_VOCABULARY.entries, seedSuffix),
      });
    } else {
      let row: IndexedSentenceRow | undefined = letterPicked[letterIdx];
      letterIdx += 1;
      if (!row) {
        const fb = findLetterMixupRow(topicId, pool, indexed, usedLetter, syntheticLetterRows);
        if (fb) {
          row = fb.row;
          if (fb.letterFallbackNote && !debugWarnings.includes(fb.letterFallbackNote)) {
            debugWarnings.push(fb.letterFallbackNote);
          }
        }
      }
      if (!row) {
        throw new Error(`Could not fill letter_mixup slot for topic "${topicId}"`);
      }
      usedLetter.add(rowIdentity(row));
      const built = buildLetterRawOrFallback(
        topicId,
        pool,
        indexed,
        row,
        usedLetter,
        debugWarnings,
        syntheticLetterRows,
      );
      row = built.row;
      usedLetter.add(rowIdentity(row));
      slides.push({ subtype, row, raw: built.raw });
    }
  }

  const debug: QuizCompilerDebug = {
    tier,
    candidateCount: pool.length,
    pickedRowIndices: slides.map((s) => s.row.rowIndex),
    warnings: debugWarnings,
    quizQuestionCount: questionCount,
    quizDifficultyLevel: difficultyLevel,
  };

  return { slides, debug };
}

export function finalizeQuizCompilation(
  state: QuizCompilationState,
  media?: (string | null | undefined)[],
): { questions: TestStartQuizQuestion[]; debug: QuizCompilerDebug } {
  const questions: TestStartQuizQuestion[] = [];

  for (let i = 0; i < state.slides.length; i += 1) {
    const slide = state.slides[i]!;
    const raw = { ...slide.raw };
    const url = media?.[i];
    if (url) {
      raw.image_url = url;
      raw.image_fit = "contain";
    }
    const parsed = mustParseInteraction(raw);
    if (parsed.subtype !== slide.subtype) {
      throw new Error(`Slide ${i}: expected ${slide.subtype}, got ${parsed.subtype}`);
    }
    questions.push(parsed as TestStartQuizQuestion);
  }

  return { questions, debug: state.debug };
}

/**
 * Compile validated interaction payloads for a menu topic (default 3 questions).
 */
export function runQuizCompiler(
  topicId: QuizTopicId,
  seed?: string,
  media?: (string | null | undefined)[],
  buildOptions?: Partial<QuizBuildOptions>,
): { questions: TestStartQuizQuestion[]; debug: QuizCompilerDebug } {
  return finalizeQuizCompilation(buildQuizCompilation(topicId, seed, buildOptions), media);
}
