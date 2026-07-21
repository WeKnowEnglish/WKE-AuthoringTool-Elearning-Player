import { letterMixupPayloadSchema } from "@/lib/lesson-schemas";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";
import type { PackQuizLetterScrambleCompiledQuestion } from "./compiled-question";
import type { PackQuizCompileResult } from "./compile-pack-mc-quiz";
import type { PackQuizDraft } from "./types";

export const PACK_LETTER_SCRAMBLE_PROMPT = "Spell the word.";

function letterCount(lemma: string): number {
  return (lemma.match(/[a-zA-Z]/g) ?? []).length;
}

function isUsable(row: PackLexemeResolution): boolean {
  if (row.source === "missing") return false;
  if (row.archived) return false;
  const lemma = row.lemma.trim();
  // Need ≥2 letters so the scramble isn't trivial.
  return letterCount(lemma) >= 2;
}

/** Accept lemma and a capitalized variant (same as vocab spell screens). */
export function packLetterScrambleAcceptedWords(lemma: string): string[] {
  const trimmed = lemma.trim();
  if (!trimmed) return [];
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return trimmed === capitalized ? [trimmed] : [trimmed, capitalized];
}

function buildLetterQuestion(
  target: PackLexemeResolution,
  seed: string,
): PackQuizLetterScrambleCompiledQuestion {
  const lemma = target.lemma.trim();
  const payload = letterMixupPayloadSchema.parse({
    type: "interaction",
    subtype: "letter_mixup",
    prompt: PACK_LETTER_SCRAMBLE_PROMPT,
    items: [
      {
        id: target.id,
        target_word: lemma,
        accepted_words: packLetterScrambleAcceptedWords(lemma),
      },
    ],
    shuffle_letters: true,
    letter_shuffle_seed: `${seed}:letters`,
    case_sensitive: false,
    image_use_tts: true,
    image_read_aloud_text: lemma,
  });

  return {
    id: `${target.id}:letter`,
    wordId: target.id,
    format: "letter_scramble",
    payload,
  };
}

/**
 * Compile a letter-scramble pack quiz from selected lexemes.
 * One `letter_mixup` question per usable word (spell that lemma).
 */
export function compilePackLetterScrambleQuiz(input: {
  draft: PackQuizDraft;
  lexemes: readonly PackLexemeResolution[];
  seed?: string;
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

  if (ordered.length < 1) {
    return {
      draft: input.draft,
      questions: [],
      skippedWordIds,
      warnings: [
        "Need at least 1 usable word with 2+ letters to build letter scramble questions.",
      ],
    };
  }

  const seedBase = input.seed ?? input.draft.createdAt;
  const maxQuestions = Math.max(
    1,
    Math.min(input.questionCount ?? ordered.length, ordered.length),
  );
  const targets = shuffleWithSeed(ordered, `${seedBase}:letter-targets`).slice(
    0,
    maxQuestions,
  );

  const questions: PackQuizLetterScrambleCompiledQuestion[] = targets.map((target) =>
    buildLetterQuestion(target, `${seedBase}:${target.id}`),
  );

  if (skippedWordIds.length > 0) {
    warnings.push(
      `Skipped ${skippedWordIds.length} word${skippedWordIds.length === 1 ? "" : "s"} (missing, archived, or too short to scramble).`,
    );
  }

  return {
    draft: input.draft,
    questions,
    skippedWordIds,
    warnings,
  };
}
