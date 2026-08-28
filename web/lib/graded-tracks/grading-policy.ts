import type { ActivityTrackPartKind } from "@/lib/activity-tracks/types";
import type { GradedActivityPolicy } from "@/lib/graded-activities";
import { homeworkCollectionGradingMode } from "@/lib/homework-collections";
import type { HomeworkCollectionPartKind } from "@/lib/homework-collections";

export function gradedTrackTemplateGradingPolicy(
  kind: string,
): GradedActivityPolicy {
  if (
    kind === "picture_writing" ||
    kind === "question_writing" ||
    kind === "writing_prompt" ||
    kind === "free_response" ||
    kind === "speaking_prompt"
  ) {
    return "teacher_review";
  }
  if (kind === "flashcards" || kind === "explore_hotspots") return "completion";
  return "automatic";
}

export function gradedTrackCollectionGradingPolicy(
  kind: HomeworkCollectionPartKind,
): GradedActivityPolicy {
  return homeworkCollectionGradingMode(kind);
}

export function gradedTrackPartKindPolicy(kind: ActivityTrackPartKind | string): GradedActivityPolicy {
  return gradedTrackTemplateGradingPolicy(kind);
}
