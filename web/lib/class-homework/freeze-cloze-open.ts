import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  listClozeOpenGaps,
  resolveClozeOpenFromBankPayload,
  validateClozeOpenDocument,
} from "@/lib/cloze-open";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export function freezeClozeOpenHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "cloze_open" }> {
  const activityId = input.activityId.trim();
  if (!activityId) throw new Error("Missing Activity Bank item.");
  if (input.format !== "cloze_open") {
    throw new Error("Only open cloze bank rows can freeze as cloze_open homework.");
  }
  const document = validateClozeOpenDocument(
    resolveClozeOpenFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );
  return {
    type: "cloze_open",
    activityId,
    title: input.titleHint?.trim() || document.title,
    gapCount: listClozeOpenGaps(document.segments).length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
