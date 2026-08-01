import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolvePictureClozeFromBankPayload,
  validatePictureClozeDocument,
} from "@/lib/picture-cloze";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked picture cloze document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezePictureClozeHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "picture_cloze" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "picture_cloze") {
    throw new Error("Only picture cloze bank rows can freeze as picture_cloze homework.");
  }

  const document = validatePictureClozeDocument(
    resolvePictureClozeFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "picture_cloze",
    activityId,
    title: input.titleHint?.trim() || document.title,
    itemCount: document.items.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
