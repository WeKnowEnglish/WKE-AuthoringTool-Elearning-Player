import {
  hasBrokenThisIsPattern,
  thisLemmaStatement,
} from "./lemma-statement";
import { vocabClozeVariants } from "./vocab-cloze";
import { pickNWithSeed, randomWithSeed } from "./shuffle";
import type { VocabWord, VocabularySetDefinition } from "./types";

const TF_GROUP_TITLE = "Is this sentence true?";

export type VocabTfBuildResult = {
  statement: string;
  correct: boolean;
  imageUrl: string;
  /** Corrective after a wrong tap (“This is …” / “These are …”). */
  pictureTruthStatement: string;
};

/** Picture-description T/F only: “This is …” / “These are …”. */
export function isPictureDescriptionStatement(sentence: string): boolean {
  const s = sentence.trim();
  return /^This is /i.test(s) || /^These are /i.test(s);
}

function pickOtherWord(words: VocabWord[], targetId: string, seed: string): VocabWord {
  const others = words.filter((w) => w.id !== targetId);
  if (others.length === 0) {
    throw new Error("vocab-tf-statements: need at least two words in set");
  }
  return pickNWithSeed(others, 1, seed)[0]!;
}

/** T/F must not reuse fill-in-the-blank sentence text from the set. */
export function isClozeDerivedSentence(
  def: VocabularySetDefinition,
  sentence: string,
): boolean {
  const norm = sentence.trim().toLowerCase();
  if (!norm) return false;
  for (const w of def.words) {
    for (const cloze of vocabClozeVariants(w)) {
      for (const acc of cloze.acceptable) {
        const filled = cloze.template
          .replace(/__\d+__/gi, acc)
          .trim()
          .toLowerCase();
        if (norm === filled) return true;
      }
      const bare = cloze.template.replace(/__\d+__/g, "").trim().toLowerCase();
      if (bare.length > 8 && norm.includes(bare)) return true;
    }
  }
  return false;
}

function filterManualFalseClaims(
  def: VocabularySetDefinition,
  targetId: string,
): string[] {
  const raw = def.falseClaims?.[targetId] ?? [];
  return raw
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      if (!isPictureDescriptionStatement(s)) return false;
      if (isClozeDerivedSentence(def, s)) return false;
      if (hasBrokenThisIsPattern(s)) return false;
      return true;
    });
}

function pickFromManual(
  claims: string[],
  seed: string,
  targetId: string,
): string {
  const idx = Math.min(
    claims.length - 1,
    Math.floor(randomWithSeed(`${seed}:tf-f3-pick:${targetId}`) * claims.length),
  );
  return claims[idx]!;
}

function buildFalseStatement(
  def: VocabularySetDefinition,
  target: VocabWord,
  seed: string,
): string {
  const manual = filterManualFalseClaims(def, target.id);
  if (
    manual.length > 0 &&
    randomWithSeed(`${seed}:tf-use-manual:${target.id}`) < 0.35
  ) {
    return pickFromManual(manual, seed, target.id);
  }
  const other = pickOtherWord(def.words, target.id, `${seed}:tf-false-word:${target.id}`);
  return thisLemmaStatement(other);
}

function sanitizeStatement(
  def: VocabularySetDefinition,
  target: VocabWord,
  seed: string,
  statement: string,
  correct: boolean,
): Pick<VocabTfBuildResult, "statement" | "correct"> {
  const trimmed = statement.trim();
  if (
    trimmed &&
    isPictureDescriptionStatement(trimmed) &&
    !hasBrokenThisIsPattern(trimmed) &&
    !isClozeDerivedSentence(def, trimmed)
  ) {
    return { statement: trimmed, correct };
  }
  if (correct) {
    return { statement: thisLemmaStatement(target), correct: true };
  }
  const other = pickOtherWord(def.words, target.id, `${seed}:tf-sanitize-word:${target.id}`);
  return { statement: thisLemmaStatement(other), correct: false };
}

export function buildVocabTrueFalseStatement(
  def: VocabularySetDefinition,
  target: VocabWord,
  seed: string,
): VocabTfBuildResult {
  const truth = thisLemmaStatement(target);
  const isTrue = randomWithSeed(`${seed}:tf-polarity:${target.id}`) >= 0.5;

  const rawStatement = isTrue ? truth : buildFalseStatement(def, target, seed);
  const { statement, correct } = sanitizeStatement(
    def,
    target,
    seed,
    rawStatement,
    isTrue,
  );

  return {
    statement,
    correct,
    imageUrl: target.imageUrl,
    pictureTruthStatement: truth,
  };
}

export { TF_GROUP_TITLE };
