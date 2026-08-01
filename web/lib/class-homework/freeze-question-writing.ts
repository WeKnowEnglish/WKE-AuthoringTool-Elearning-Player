import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolveQuestionWritingFromBankPayload,
  validateQuestionWritingDocument,
} from "@/lib/question-writing";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked question writing document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezeQuestionWritingHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "question_writing" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "question_writing") {
    throw new Error(
      "Only question writing bank rows can freeze as question_writing homework.",
    );
  }

  const document = validateQuestionWritingDocument(
    resolveQuestionWritingFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "question_writing",
    activityId,
    title: input.titleHint?.trim() || document.title,
    promptCount: document.prompts.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
