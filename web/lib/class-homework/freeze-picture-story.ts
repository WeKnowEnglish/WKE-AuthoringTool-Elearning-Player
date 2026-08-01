import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolvePictureStoryFromBankPayload,
  validatePictureStoryDocument,
} from "@/lib/picture-story";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export function freezePictureStoryHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "picture_story" }> {
  const activityId = input.activityId.trim();
  if (!activityId) throw new Error("Missing Activity Bank item.");
  if (input.format !== "picture_story") {
    throw new Error(
      "Only picture story bank rows can freeze as picture_story homework.",
    );
  }
  const document = validatePictureStoryDocument(
    resolvePictureStoryFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );
  return {
    type: "picture_story",
    activityId,
    title: input.titleHint?.trim() || document.title,
    questionCount: document.questions.length,
    frameCount: document.frames.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
