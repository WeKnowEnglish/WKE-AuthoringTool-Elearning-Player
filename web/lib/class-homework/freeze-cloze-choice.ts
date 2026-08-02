import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolveClozeChoiceFromBankPayload,
  validateClozeChoiceDocument,
  listClozeChoiceGaps,
} from "@/lib/cloze-choice";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked cloze-choice document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezeClozeChoiceHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "cloze_choice" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "cloze_choice") {
    throw new Error(
      "Only cloze choice bank rows can freeze as cloze_choice homework.",
    );
  }

  const document = validateClozeChoiceDocument(
    resolveClozeChoiceFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "cloze_choice",
    activityId,
    title: input.titleHint?.trim() || document.title,
    gapCount: listClozeChoiceGaps(document.segments).length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
