import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolveSentenceColumnsFromBankPayload,
  validateSentenceColumnsDocument,
} from "@/lib/sentence-columns";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked sentence columns document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezeSentenceColumnsHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "sentence_columns" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "sentence_columns") {
    throw new Error(
      "Only sentence columns bank rows can freeze as sentence_columns homework.",
    );
  }

  const document = validateSentenceColumnsDocument(
    resolveSentenceColumnsFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "sentence_columns",
    activityId,
    title: input.titleHint?.trim() || document.title,
    challengeCount: document.challenges.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
