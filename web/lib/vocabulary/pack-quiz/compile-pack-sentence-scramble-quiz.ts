import {
  scrambleTilesFromSentence,
  tokenizeSentenceForScramble,
} from "@/lib/games-sentence-scramble/scramble-tiles";
import { dragSentencePayloadSchema } from "@/lib/lesson-schemas";
import {
  inferLemmaGrammar,
  iLikeLemmaStatement,
  thisLemmaStatement,
} from "@/lib/vocabulary-templates/lemma-statement";
import { randomWithSeed, shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";
import type { PackQuizSentenceScrambleCompiledQuestion } from "./compiled-question";
import type { PackQuizCompileResult } from "./compile-pack-mc-quiz";
import type { PackQuizDraft } from "./types";

export const PACK_SENTENCE_SCRAMBLE_BODY = "Put the words in order.";

export { tokenizeSentenceForScramble, scrambleTilesFromSentence };

function isUsable(row: PackLexemeResolution): boolean {
  if (row.source === "missing") return false;
  if (row.archived) return false;
  return Boolean(row.lemma.trim());
}

/** Starter line when the lexeme has no curated example sentence. */
export function packSentenceScrambleStarter(
  lemma: string,
  seed: string,
): string {
  const trimmed = lemma.trim();
  const word = {
    lemma: trimmed,
    grammar: inferLemmaGrammar(trimmed),
  };
  const pick = randomWithSeed(`${seed}:style`);
  if (pick < 0.5) return thisLemmaStatement(word);
  return iLikeLemmaStatement(word);
}

export function buildDragSentencePayloadFromText(input: {
  sentence: string;
  seed: string;
  bodyText?: string;
  imageUrl?: string;
}): ReturnType<typeof dragSentencePayloadSchema.parse> | null {
  const tokens = scrambleTilesFromSentence(input.sentence);
  if (tokens.length < 2) return null;

  const body = input.bodyText?.trim() || PACK_SENTENCE_SCRAMBLE_BODY;
  const imageUrl = input.imageUrl?.trim();

  return dragSentencePayloadSchema.parse({
    type: "interaction",
    subtype: "drag_sentence",
    body_text: body,
    sentence_slots: tokens.map(() => ""),
    word_bank: shuffleWithSeed(tokens, `${input.seed}:bank`),
    correct_order: tokens,
    ...(imageUrl ? { image_url: imageUrl, image_fit: "contain" as const } : {}),
  });
}

function resolveSentence(
  row: PackLexemeResolution,
  seed: string,
): { sentence: string; usedStarter: boolean } {
  // Optional future field / flashcard hydrate — prefer when present.
  const curated =
    typeof (row as { exampleSentence?: string | null }).exampleSentence === "string"
      ? (row as { exampleSentence?: string | null }).exampleSentence?.trim()
      : "";
  if (curated && tokenizeSentenceForScramble(curated).length >= 2) {
    return { sentence: curated, usedStarter: false };
  }
  return {
    sentence: packSentenceScrambleStarter(row.lemma, seed),
    usedStarter: true,
  };
}

function buildSentenceQuestion(
  target: PackLexemeResolution,
  seed: string,
): { question: PackQuizSentenceScrambleCompiledQuestion; usedStarter: boolean } | null {
  const { sentence, usedStarter } = resolveSentence(target, seed);
  const payload = buildDragSentencePayloadFromText({ sentence, seed });
  if (!payload) return null;

  return {
    usedStarter,
    question: {
      id: `${target.id}:sentence`,
      wordId: target.id,
      format: "sentence_scramble",
      payload,
    },
  };
}

/**
 * Compile a sentence-scramble pack quiz from selected lexemes.
 * One `drag_sentence` question per usable word.
 * Words without a curated example get a starter sentence teachers can edit.
 */
export function compilePackSentenceScrambleQuiz(input: {
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
      warnings: ["Need at least 1 usable word to build sentence scramble questions."],
    };
  }

  const seedBase = input.seed ?? input.draft.createdAt;
  const maxQuestions = Math.max(
    1,
    Math.min(input.questionCount ?? ordered.length, ordered.length),
  );
  const targets = shuffleWithSeed(ordered, `${seedBase}:sentence-targets`).slice(
    0,
    maxQuestions,
  );

  const questions: PackQuizSentenceScrambleCompiledQuestion[] = [];
  let starterCount = 0;
  for (const target of targets) {
    const built = buildSentenceQuestion(target, `${seedBase}:${target.id}`);
    if (!built) {
      skippedWordIds.push(target.id);
      continue;
    }
    questions.push(built.question);
    if (built.usedStarter) starterCount += 1;
  }

  if (starterCount > 0) {
    warnings.push(
      `${starterCount} question${starterCount === 1 ? "" : "s"} use starter sentence${
        starterCount === 1 ? "" : "s"
      } — edit them in the sheet before assigning.`,
    );
  }

  if (questions.length === 0) {
    warnings.push("Could not build any sentence scramble questions from the selected words.");
  }

  return {
    draft: input.draft,
    questions,
    skippedWordIds,
    warnings,
  };
}
