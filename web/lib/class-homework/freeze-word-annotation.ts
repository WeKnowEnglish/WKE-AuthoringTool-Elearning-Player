import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  countWordAnnotationTargets,
  resolveWordAnnotationFromBankPayload,
  validateWordAnnotationDocument,
} from "@/lib/word-annotation";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked word annotation document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezeWordAnnotationHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "word_annotation" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "word_annotation") {
    throw new Error(
      "Only word annotation bank rows can freeze as word_annotation homework.",
    );
  }

  const document = validateWordAnnotationDocument(
    resolveWordAnnotationFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "word_annotation",
    activityId,
    title: input.titleHint?.trim() || document.title,
    targetCount: countWordAnnotationTargets(document.sentences),
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
