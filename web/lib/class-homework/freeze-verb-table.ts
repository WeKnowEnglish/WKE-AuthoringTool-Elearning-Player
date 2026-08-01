import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolveVerbTableFromBankPayload,
  validateVerbTableDocument,
} from "@/lib/verb-table";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked verb table document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezeVerbTableHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "verb_table" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "verb_table") {
    throw new Error("Only verb table bank rows can freeze as verb_table homework.");
  }

  const document = validateVerbTableDocument(
    resolveVerbTableFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "verb_table",
    activityId,
    title: input.titleHint?.trim() || document.title,
    rowCount: document.rows.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
