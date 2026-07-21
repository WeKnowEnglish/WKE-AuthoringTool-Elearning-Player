import {
  dragSentencePayloadSchema,
  letterMixupPayloadSchema,
  mcQuizPayloadSchema,
  trueFalsePayloadSchema,
} from "@/lib/lesson-schemas";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import type {
  PackQuizCompiledQuestion,
  PackQuizMcMode,
} from "@/lib/vocabulary/pack-quiz";
import { packQuizFormatFromPayloadSubtype } from "@/lib/vocabulary/pack-quiz/compiled-question";

const MAX_FROZEN_QUESTIONS = 200;

const MODES: readonly PackQuizMcMode[] = [
  "word_for_meaning_en",
  "meaning_for_word_en",
  "find_lemma",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Parse stored pack-quiz questions (MC + future formats).
 * Legacy MC rows without `format` are inferred from `payload.subtype` + `mode`.
 */
export function parseStoredPackQuizQuestions(raw: unknown): PackQuizCompiledQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: PackQuizCompiledQuestion[] = [];

  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const wordId = typeof row.wordId === "string" ? row.wordId.trim() : "";
    if (!id || !wordId) continue;

    const payloadRaw = asRecord(row.payload);
    if (!payloadRaw) continue;
    const subtype = typeof payloadRaw.subtype === "string" ? payloadRaw.subtype : "";
    const formatFromField =
      typeof row.format === "string" ? (row.format as string) : null;
    const format =
      formatFromField === "multiple_choice" ||
      formatFromField === "true_false" ||
      formatFromField === "letter_scramble" ||
      formatFromField === "sentence_scramble"
        ? formatFromField
        : packQuizFormatFromPayloadSubtype(subtype);
    if (!format) continue;

    if (format === "multiple_choice") {
      const mode = row.mode;
      if (typeof mode !== "string" || !(MODES as readonly string[]).includes(mode)) {
        continue;
      }
      const parsed = mcQuizPayloadSchema.safeParse(payloadRaw);
      if (!parsed.success) continue;
      out.push({
        id,
        wordId,
        format: "multiple_choice",
        mode: mode as PackQuizMcMode,
        payload: parsed.data,
      });
    } else if (format === "true_false") {
      const parsed = trueFalsePayloadSchema.safeParse(payloadRaw);
      if (!parsed.success) continue;
      out.push({ id, wordId, format: "true_false", payload: parsed.data });
    } else if (format === "letter_scramble") {
      const parsed = letterMixupPayloadSchema.safeParse(payloadRaw);
      if (!parsed.success) continue;
      out.push({ id, wordId, format: "letter_scramble", payload: parsed.data });
    } else if (format === "sentence_scramble") {
      const parsed = dragSentencePayloadSchema.safeParse(payloadRaw);
      if (!parsed.success) continue;
      out.push({ id, wordId, format: "sentence_scramble", payload: parsed.data });
    }

    if (out.length >= MAX_FROZEN_QUESTIONS) break;
  }

  return out;
}

export type PackQuizHomeworkPayload = Extract<ClassHomeworkPayload, { type: "pack_quiz" }>;

/**
 * Build a pack_quiz homework payload from the current quiz questions.
 * Always writes the provided questions (homework tracks the latest quiz version).
 */
export function freezePackQuizPayload(input: {
  quizId: string;
  quizTitle: string;
  questions: readonly PackQuizCompiledQuestion[];
  /** @deprecated Ignored — homework always takes the latest questions. */
  previous?: PackQuizHomeworkPayload | null;
  frozenAt?: string;
}): PackQuizHomeworkPayload {
  const quizId = input.quizId.trim();
  const quizTitle = input.quizTitle.trim() || "Pack quiz";
  const questions = parseStoredPackQuizQuestions(input.questions).slice(0, MAX_FROZEN_QUESTIONS);
  return {
    type: "pack_quiz",
    quizId,
    quizTitle,
    questionCount: questions.length,
    questions,
    frozenAt: input.frozenAt ?? new Date().toISOString(),
  };
}
