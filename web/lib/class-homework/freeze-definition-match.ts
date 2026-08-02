import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolveDefinitionMatchFromBankPayload,
  validateDefinitionMatchDocument,
} from "@/lib/definition-match";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

/**
 * Freeze a banked definition match document into homework.
 * Plays via the dedicated non–Lesson Player shell.
 */
export function freezeDefinitionMatchHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "definition_match" }> {
  const activityId = input.activityId.trim();
  if (!activityId) {
    throw new Error("Missing Activity Bank item.");
  }
  if (input.format !== "definition_match") {
    throw new Error(
      "Only definition match bank rows can freeze as definition_match homework.",
    );
  }

  const document = validateDefinitionMatchDocument(
    resolveDefinitionMatchFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );

  return {
    type: "definition_match",
    activityId,
    title: input.titleHint?.trim() || document.title,
    pairCount: document.pairs.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
