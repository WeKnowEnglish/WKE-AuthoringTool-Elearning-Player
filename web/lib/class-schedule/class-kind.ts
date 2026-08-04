export const TEACHER_CLASS_KINDS = ["regular", "trial"] as const;
export type TeacherClassKind = (typeof TEACHER_CLASS_KINDS)[number];

export const TEACHER_CLASS_KIND_LABELS: Record<TeacherClassKind, string> = {
  regular: "Regular class",
  trial: "Trial class",
};

export function normalizeTeacherClassKind(value: unknown): TeacherClassKind {
  return value === "trial" ? "trial" : "regular";
}
