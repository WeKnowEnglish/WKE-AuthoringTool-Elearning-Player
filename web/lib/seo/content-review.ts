export type ContentReviewStatus =
  | "prototype"
  | "editor-reviewed"
  | "teacher-tested"
  | "classroom-tested";

export function reviewStatusLabel(status: ContentReviewStatus): string | null {
  switch (status) {
    case "prototype":
      return null;
    case "editor-reviewed":
      return "Reviewed for elementary ESL learners";
    case "teacher-tested":
      return "Designed by an experienced classroom teacher";
    case "classroom-tested":
      return "Classroom-tested with upper-primary learners";
    default:
      return null;
  }
}
