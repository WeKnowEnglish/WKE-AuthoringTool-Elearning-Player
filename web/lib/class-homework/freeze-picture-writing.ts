import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolvePictureWritingFromBankPayload,
  validatePictureWritingDocument,
} from "@/lib/picture-writing";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked picture writing document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezePictureWritingHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "picture_writing" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "picture_writing") {
    throw new Error(
      "Only picture writing bank rows can freeze as picture_writing homework.",
    );
  }

  const document = validatePictureWritingDocument(
    resolvePictureWritingFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "picture_writing",
    activityId,
    title: input.titleHint?.trim() || document.title,
    promptCount: document.prompts.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
