import { mcQuizPayloadSchema, type McQuizPayload } from "@/lib/lesson-schemas";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";
import type {
  PackQuizCompiledQuestion,
  PackQuizMcCompiledQuestion,
  PackQuizMcMode,
} from "./compiled-question";
import type { PackQuizDraft } from "./types";

export type { PackQuizMcMode } from "./compiled-question";
export type { PackQuizCompiledQuestion } from "./compiled-question";

export type PackQuizCompileResult = {
  draft: PackQuizDraft;
  questions: PackQuizCompiledQuestion[];
  skippedWordIds: string[];
  warnings: string[];
};

const OPTION_IDS = ["a", "b", "c", "d"] as const;
const DISTRACTOR_COUNT = 3;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueByKey(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function isUsable(row: PackLexemeResolution): boolean {
  if (row.source === "missing") return false;
  if (row.archived) return false;
  return Boolean(row.lemma.trim());
}

function buildMcPayload(
  question: string,
  correctLabel: string,
  wrongLabels: string[],
  seed: string,
): McQuizPayload {
  const labels = shuffleWithSeed([correctLabel, ...wrongLabels], `${seed}:opts`);
  const options = labels.map((label, i) => ({
    id: OPTION_IDS[i] ?? `o${i}`,
    label,
  }));
  const correct = options.find((o) => normalizeKey(o.label) === normalizeKey(correctLabel));
  return mcQuizPayloadSchema.parse({
    type: "interaction",
    subtype: "mc_quiz",
    question,
    options,
    correct_option_id: correct?.id ?? options[0]?.id ?? "a",
    shuffle_options: false,
  });
}

function peerLemmas(target: PackLexemeResolution, pool: PackLexemeResolution[]): string[] {
  return uniqueByKey(
    pool.filter((p) => p.id !== target.id).map((p) => p.lemma),
  ).filter((lemma) => normalizeKey(lemma) !== normalizeKey(target.lemma));
}

function peerMeanings(target: PackLexemeResolution, pool: PackLexemeResolution[]): string[] {
  const correct = normalizeKey(target.definitionEn ?? "");
  return uniqueByKey(
    pool
      .filter((p) => p.id !== target.id)
      .map((p) => p.definitionEn?.trim() ?? "")
      .filter(Boolean),
  ).filter((meaning) => normalizeKey(meaning) !== correct);
}

function pickMode(
  target: PackLexemeResolution,
  pool: PackLexemeResolution[],
  seed: string,
): PackQuizMcMode | null {
  const lemmas = peerLemmas(target, pool);
  if (lemmas.length < DISTRACTOR_COUNT) return null;

  const hasDef = Boolean(target.definitionEn?.trim());
  const meaningPool = peerMeanings(target, pool);

  if (hasDef && meaningPool.length >= DISTRACTOR_COUNT) {
    // Alternate when both meaning modes are viable.
    return shuffleWithSeed(
      ["word_for_meaning_en", "meaning_for_word_en"] as const,
      `${seed}:mode`,
    )[0]!;
  }
  if (hasDef) return "word_for_meaning_en";
  return "find_lemma";
}

function buildQuestion(
  target: PackLexemeResolution,
  pool: PackLexemeResolution[],
  seed: string,
): PackQuizMcCompiledQuestion | null {
  const mode = pickMode(target, pool, seed);
  if (!mode) return null;

  if (mode === "word_for_meaning_en") {
    const def = target.definitionEn!.trim();
    const wrong = shuffleWithSeed(peerLemmas(target, pool), `${seed}:wrong`).slice(
      0,
      DISTRACTOR_COUNT,
    );
    return {
      id: `${target.id}:word-for-meaning`,
      wordId: target.id,
      format: "multiple_choice",
      mode,
      payload: buildMcPayload(
        `Which word matches this meaning?\n${def}`,
        target.lemma.trim(),
        wrong,
        seed,
      ),
    };
  }

  if (mode === "meaning_for_word_en") {
    const def = target.definitionEn!.trim();
    const wrong = shuffleWithSeed(peerMeanings(target, pool), `${seed}:wrong`).slice(
      0,
      DISTRACTOR_COUNT,
    );
    return {
      id: `${target.id}:meaning-for-word`,
      wordId: target.id,
      format: "multiple_choice",
      mode,
      payload: buildMcPayload(`What does ${target.lemma.trim()} mean?`, def, wrong, seed),
    };
  }

  const wrong = shuffleWithSeed(peerLemmas(target, pool), `${seed}:wrong`).slice(
    0,
    DISTRACTOR_COUNT,
  );
  return {
    id: `${target.id}:find-lemma`,
    wordId: target.id,
    format: "multiple_choice",
    mode: "find_lemma",
    payload: buildMcPayload(`Find the word: ${target.lemma.trim()}`, target.lemma.trim(), wrong, seed),
  };
}

/**
 * Compile a teacher-preview MC quiz from a frozen pack draft + hydrated lexemes.
 * Distractors come from other words in the same selection snapshot.
 * By default builds one question per usable selected word (optional `questionCount` caps).
 */
export function compilePackMultipleChoiceQuiz(input: {
  draft: PackQuizDraft;
  lexemes: readonly PackLexemeResolution[];
  seed?: string;
  /** Optional cap; defaults to one question per usable selected word. */
  questionCount?: number;
}): PackQuizCompileResult {
  const warnings: string[] = [];
  const byId = new Map(input.lexemes.map((row) => [row.id, row]));
  const ordered: PackLexemeResolution[] = [];
  const skippedWordIds: string[] = [];

  for (const id of input.draft.wordIds) {
    const row = byId.get(id);
    if (!row || !isUsable(row)) {
      skippedWordIds.push(id);
      continue;
    }
    ordered.push(row);
  }

  if (ordered.length < 4) {
    return {
      draft: input.draft,
      questions: [],
      skippedWordIds,
      warnings: [
        `Need at least 4 usable words to build multiple choice (found ${ordered.length}).`,
      ],
    };
  }

  const withDefs = ordered.filter((r) => r.definitionEn?.trim()).length;
  if (withDefs === 0) {
    warnings.push("No English definitions in this pack — using find-the-word questions.");
  } else if (withDefs < ordered.length) {
    warnings.push(
      `${ordered.length - withDefs} word${ordered.length - withDefs === 1 ? "" : "s"} missing definitions — mixed in find-the-word questions.`,
    );
  }

  const seedBase = input.seed ?? input.draft.createdAt;
  const maxQuestions = Math.max(
    1,
    Math.min(input.questionCount ?? ordered.length, ordered.length),
  );
  const targets = shuffleWithSeed(ordered, `${seedBase}:targets`).slice(0, maxQuestions);

  const questions: PackQuizMcCompiledQuestion[] = [];
  for (const target of targets) {
    const q = buildQuestion(target, ordered, `${seedBase}:${target.id}`);
    if (q) questions.push(q);
  }

  if (questions.length === 0) {
    warnings.push("Could not build any multiple-choice questions from this pack.");
  }

  return {
    draft: input.draft,
    questions,
    skippedWordIds,
    warnings,
  };
}
