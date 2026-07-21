import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import { CLASS_HOMEWORK_PAYLOAD_LABELS } from "@/lib/class-homework/types";
import { homeworkPayloadSummary } from "@/lib/class-homework/normalize";
import { sourceLabelForHomeworkPayloadType } from "@/lib/assignable-activities/map";

export function resolvePackTitleForQuiz(
  quizId: string,
  packQuizzes: readonly { id: string; packId: string | null }[],
  packTitleById: ReadonlyMap<string, string>,
): string | null {
  const quiz = packQuizzes.find((item) => item.id === quizId);
  if (!quiz?.packId) return null;
  return packTitleById.get(quiz.packId) ?? null;
}

/** Extra meta for pack-quiz homework rows (pack name + frozen). */
export function formatPackQuizHomeworkExtras(
  payload: Extract<ClassHomeworkPayload, { type: "pack_quiz" }>,
  packTitle: string | null,
): string {
  const parts: string[] = [];
  if (packTitle) parts.push(`from ${packTitle}`);
  if (Array.isArray(payload.questions) && payload.questions.length > 0) {
    parts.push("latest");
  }
  return parts.join(" · ");
}

export function formatHomeworkListSubtitle(
  payload: ClassHomeworkPayload,
  options?: {
    packTitle?: string | null;
    dueLabel?: string;
  },
): string {
  const catalogLabel = sourceLabelForHomeworkPayloadType(payload.type);
  const parts = [
    catalogLabel ?? CLASS_HOMEWORK_PAYLOAD_LABELS[payload.type],
    homeworkPayloadSummary(payload),
  ];
  if (payload.type === "pack_quiz") {
    const extras = formatPackQuizHomeworkExtras(payload, options?.packTitle ?? null);
    if (extras) parts.push(extras);
  }
  if (payload.type === "pack_flashcards") {
    const extras = formatPackFlashcardsHomeworkExtras(payload, options?.packTitle ?? null);
    if (extras) parts.push(extras);
  }
  if (options?.dueLabel) parts.push(options.dueLabel);
  return parts.join(" · ");
}

/** Extra meta for flashcard homework rows (pack name + frozen). */
export function formatPackFlashcardsHomeworkExtras(
  payload: Extract<ClassHomeworkPayload, { type: "pack_flashcards" }>,
  packTitle: string | null,
): string {
  const parts: string[] = [];
  if (packTitle) parts.push(`from ${packTitle}`);
  if (Array.isArray(payload.cards) && payload.cards.length > 0) {
    parts.push("frozen");
  }
  return parts.join(" · ");
}

export function resolvePackTitleForFlashcardSet(
  setId: string,
  flashcardSets: readonly { id: string; packId: string | null }[],
  packTitleById: ReadonlyMap<string, string>,
): string | null {
  const set = flashcardSets.find((item) => item.id === setId);
  if (!set?.packId) return null;
  return packTitleById.get(set.packId) ?? null;
}

export type PackQuizEmptyDropdownKind = "no_packs" | "no_quizzes";

export function packQuizEmptyDropdownCopy(
  kind: PackQuizEmptyDropdownKind,
): { body: string; packsHref: string; quizzesHref: string } {
  if (kind === "no_packs") {
    return {
      body: "Link a word pack to this class first (Word packs → open pack → set class), then Make a quiz and Save.",
      packsHref: "/teacher/word-packs?tab=packs",
      quizzesHref: "/teacher/word-packs?tab=quizzes",
    };
  }
  return {
    body: "No saved pack quizzes for this class yet. Open a linked pack → Make a quiz → Save, then assign the activity here (or from Word packs → Quizzes).",
    packsHref: "/teacher/word-packs?tab=packs",
    quizzesHref: "/teacher/word-packs?tab=quizzes",
  };
}

export type PackFlashcardsEmptyDropdownKind = "no_packs" | "no_sets";

export function packFlashcardsEmptyDropdownCopy(
  kind: PackFlashcardsEmptyDropdownKind,
): { body: string; packsHref: string; flashcardsHref: string } {
  if (kind === "no_packs") {
    return {
      body: "Link a word pack to this class first (Word packs → open pack → set class), then Make flashcards and Save.",
      packsHref: "/teacher/word-packs?tab=packs",
      flashcardsHref: "/teacher/word-packs?tab=flashcards",
    };
  }
  return {
    body: "No saved flashcard sets for this class yet. Open a linked pack → Make flashcards → Save, then assign here (or from Word packs → Flashcards).",
    packsHref: "/teacher/word-packs?tab=packs",
    flashcardsHref: "/teacher/word-packs?tab=flashcards",
  };
}
