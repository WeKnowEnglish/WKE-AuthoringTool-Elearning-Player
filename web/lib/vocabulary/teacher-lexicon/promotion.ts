import type { TeacherLexiconEntry, TeacherLexiconPromotionStatus } from "./types";
import { isTeacherLexiconReadyForClass } from "./readiness";

export type PromotionMissingField =
  | "pos"
  | "primaryStage"
  | "primaryTopic"
  | "learnerDefinitionEn"
  | "learnerMeaningVi";

/** Fields curriculum may want filled before approve (VI optional but listed). */
export function teacherLexiconPromotionGaps(entry: TeacherLexiconEntry): PromotionMissingField[] {
  const gaps: PromotionMissingField[] = [];
  if (!entry.pos || entry.pos === "unspecified") gaps.push("pos");
  if (!entry.primaryStage?.trim()) gaps.push("primaryStage");
  if (!entry.primaryTopic?.trim()) gaps.push("primaryTopic");
  if (!entry.learnerDefinitionEn?.trim()) gaps.push("learnerDefinitionEn");
  if (!entry.learnerMeaningVi?.trim()) gaps.push("learnerMeaningVi");
  return gaps;
}

export function canSubmitForCurriculum(entry: TeacherLexiconEntry): boolean {
  if (entry.archivedAt || entry.status === "archived") return false;
  if (!isTeacherLexiconReadyForClass(entry)) return false;
  if (entry.promotionStatus === "pending" || entry.promotionStatus === "approved") return false;
  // Require at least an English meaning before entering the queue.
  if (!entry.learnerDefinitionEn?.trim()) return false;
  return true;
}

export function canWithdrawCurriculumSubmission(entry: TeacherLexiconEntry): boolean {
  return entry.promotionStatus === "pending" && !entry.archivedAt;
}

export function promotionStatusLabel(status: TeacherLexiconPromotionStatus): string {
  switch (status) {
    case "pending":
      return "Pending review";
    case "returned":
      return "Returned";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Not submitted";
  }
}
