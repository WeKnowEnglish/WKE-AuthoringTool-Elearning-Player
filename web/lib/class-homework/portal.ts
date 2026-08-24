import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";

export type HomeworkPortal = "primary" | "secondary";

const PRIMARY_ONLY_TYPES = new Set<ClassHomeworkPayload["type"]>([
  "picture_cloze",
  "verb_table",
  "sentence_columns",
  "word_annotation",
  "picture_writing",
  "question_writing",
  "definition_match",
  "cloze_choice",
  "cloze_open",
  "read_and_answer",
  "picture_story",
  "primary_a2_assessment",
]);

/** Resolve the player from frozen assignment content, then the student's band. */
export function resolveHomeworkPortal(
  payload: ClassHomeworkPayload,
  learningBand?: string | null,
): HomeworkPortal {
  if (payload.type === "homework_template") {
    return payload.templateId === "secondary-homework-template-one"
      ? "secondary"
      : "primary";
  }
  if (payload.type === "graded_track") return payload.level;
  if (PRIMARY_ONLY_TYPES.has(payload.type)) return "primary";
  return isSecondaryEligibleBand(learningBand) ? "secondary" : "primary";
}

export function homeworkPortalPath(
  homeworkId: string,
  portal: HomeworkPortal,
): string {
  return `/${portal}/homework/${encodeURIComponent(homeworkId)}`;
}
