import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import type { PackQuizCompiledQuestion, PackQuizMcMode } from "@/lib/vocabulary/pack-quiz";

const MAX_FROZEN_QUESTIONS = 200;

const MODES: readonly PackQuizMcMode[] = [
  "word_for_meaning_en",
  "meaning_for_word_en",
  "find_lemma",
];

export function parseStoredPackQuizQuestions(raw: unknown): PackQuizCompiledQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: PackQuizCompiledQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const wordId = typeof row.wordId === "string" ? row.wordId.trim() : "";
    const mode = row.mode;
    if (!id || !wordId) continue;
    if (typeof mode !== "string" || !(MODES as readonly string[]).includes(mode)) continue;
    if (!row.payload || typeof row.payload !== "object" || Array.isArray(row.payload)) continue;
    const payload = row.payload as PackQuizCompiledQuestion["payload"];
    if (payload.type !== "interaction" || payload.subtype !== "mc_quiz") continue;
    out.push({
      id,
      wordId,
      mode: mode as PackQuizMcMode,
      payload,
    });
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
