import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  resolveReadAndAnswerFromBankPayload,
  validateReadAndAnswerDocument,
} from "@/lib/read-and-answer";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export function freezeReadAndAnswerHomeworkPayload(input: {
  activityId: string;
  format: StudioActivityFormat;
  pack: unknown;
  authoring?: unknown;
  titleHint?: string | null;
}): Extract<ClassHomeworkPayload, { type: "read_and_answer" }> {
  const activityId = input.activityId.trim();
  if (!activityId) throw new Error("Missing Activity Bank item.");
  if (input.format !== "read_and_answer") {
    throw new Error(
      "Only read and answer bank rows can freeze as read_and_answer homework.",
    );
  }
  const document = validateReadAndAnswerDocument(
    resolveReadAndAnswerFromBankPayload({
      pack: input.pack,
      authoring: input.authoring,
    }),
  );
  return {
    type: "read_and_answer",
    activityId,
    title: input.titleHint?.trim() || document.title,
    questionCount: document.questions.length,
    document: document as unknown as Record<string, unknown>,
    frozenAt: new Date().toISOString(),
  };
}
