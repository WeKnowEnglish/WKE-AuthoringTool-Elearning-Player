import { trueFalsePayloadSchema } from "@/lib/lesson-schemas";
import { randomWithSeed, shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import {
  inferLemmaGrammar,
  thisLemmaStatement,
} from "@/lib/vocabulary-templates/lemma-statement";
import type { PackLexemeResolution } from "@/lib/vocabulary/teacher-lexicon/resolve-pack";
import type { PackQuizTrueFalseCompiledQuestion } from "./compiled-question";
import type { PackQuizCompileResult } from "./compile-pack-mc-quiz";
import type { PackQuizDraft } from "./types";

function isUsable(row: PackLexemeResolution): boolean {
  if (row.source === "missing") return false;
  if (row.archived) return false;
  return Boolean(row.lemma.trim());
}

function lemmaStatementFor(row: PackLexemeResolution): string {
  const lemma = row.lemma.trim();
  return thisLemmaStatement({
    lemma,
    grammar: inferLemmaGrammar(lemma),
  });
}

function meaningStatement(row: PackLexemeResolution): string | null {
  const def = row.definitionEn?.trim();
  if (!def) return null;
  const lemma = row.lemma.trim();
  return `"${lemma}" means ${def.replace(/\.$/, "")}.`;
}

function pickOther(
  pool: PackLexemeResolution[],
  targetId: string,
  seed: string,
): PackLexemeResolution | null {
  const others = pool.filter((p) => p.id !== targetId);
  if (others.length === 0) return null;
  return shuffleWithSeed(others, seed)[0] ?? null;
}

function buildTfQuestion(
  target: PackLexemeResolution,
  pool: PackLexemeResolution[],
  seed: string,
): PackQuizTrueFalseCompiledQuestion | null {
  const truthPicture = lemmaStatementFor(target);
  const truthMeaning = meaningStatement(target);
  const wantTrue = randomWithSeed(`${seed}:polarity`) >= 0.5;
  const preferMeaning =
    Boolean(truthMeaning) && randomWithSeed(`${seed}:style`) >= 0.45;

  let statement: string;
  let correct: boolean;
  let pictureTruthStatement = truthPicture;

  if (wantTrue) {
    correct = true;
    if (preferMeaning && truthMeaning) {
      statement = truthMeaning;
    } else {
      statement = truthPicture;
    }
  } else {
    const other = pickOther(pool, target.id, `${seed}:other`);
    if (!other) {
      // Single-word packs: only true claims are reliable.
      correct = true;
      statement = preferMeaning && truthMeaning ? truthMeaning : truthPicture;
    } else {
      correct = false;
      const otherMeaning = meaningStatement(other);
      if (preferMeaning && truthMeaning && otherMeaning) {
        // Pair target lemma with someone else's meaning.
        const def = other.definitionEn!.trim().replace(/\.$/, "");
        statement = `"${target.lemma.trim()}" means ${def}.`;
        pictureTruthStatement = truthMeaning;
      } else {
        statement = lemmaStatementFor(other);
        pictureTruthStatement = truthPicture;
      }
    }
  }

  const payload = trueFalsePayloadSchema.parse({
    type: "interaction",
    subtype: "true_false",
    statement,
    correct,
    picture_truth_statement: pictureTruthStatement,
  });

  return {
    id: `${target.id}:tf`,
    wordId: target.id,
    format: "true_false",
    payload,
  };
}

/**
 * Compile a true/false pack quiz from selected lexemes.
 * One question per usable word; false claims need a peer when possible.
 */
export function compilePackTrueFalseQuiz(input: {
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
      warnings: ["Need at least 1 usable word to build true/false questions."],
    };
  }

  if (ordered.length === 1) {
    warnings.push(
      "Only one word selected — all claims are true (need ≥2 words for false claims).",
    );
  }

  const seedBase = input.seed ?? input.draft.createdAt;
  const maxQuestions = Math.max(
    1,
    Math.min(input.questionCount ?? ordered.length, ordered.length),
  );
  const targets = shuffleWithSeed(ordered, `${seedBase}:tf-targets`).slice(0, maxQuestions);

  const questions: PackQuizTrueFalseCompiledQuestion[] = [];
  for (const target of targets) {
    const q = buildTfQuestion(target, ordered, `${seedBase}:${target.id}`);
    if (q) questions.push(q);
  }

  if (questions.length === 0) {
    warnings.push("Could not build any true/false questions from the selected words.");
  }

  return {
    draft: input.draft,
    questions,
    skippedWordIds,
    warnings,
  };
}
