import type { AssignableActivityKind } from "@/lib/assignable-activities/types";
import { isAssignableActivityKind } from "@/lib/assignable-activities/types";
import type { ClassHomeworkPayloadType } from "@/lib/class-homework/types";

/** Catalog kinds map to homework payload types. */
export function homeworkPayloadTypeForAssignableKind(
  kind: AssignableActivityKind,
): Extract<ClassHomeworkPayloadType, "pack_quiz" | "pack_flashcards"> {
  if (kind === "pack_flashcards") return "pack_flashcards";
  return "pack_quiz";
}

export function assignableKindForHomeworkPayloadType(
  payloadType: string,
): AssignableActivityKind | null {
  if (payloadType === "pack_quiz") return "pack_mc_quiz";
  if (payloadType === "pack_flashcards") return "pack_flashcards";
  return null;
}

export function sourceLabelForAssignableKind(kind: AssignableActivityKind): string {
  if (kind === "pack_flashcards") return "Flashcards";
  if (kind === "pack_mc_quiz") return "Pack quiz";
  return "Activity";
}

export function sourceLabelForHomeworkPayloadType(payloadType: string): string | null {
  const kind = assignableKindForHomeworkPayloadType(payloadType);
  if (!kind || !isAssignableActivityKind(kind)) return null;
  return sourceLabelForAssignableKind(kind);
}
