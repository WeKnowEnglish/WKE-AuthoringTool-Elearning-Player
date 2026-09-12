export type HomeworkFinalizationFormat =
  | "writing_prompt"
  | "homework_template"
  | "graded_track";

export type HomeworkFinalizationReceipt = {
  homeworkId: string;
  format: HomeworkFinalizationFormat;
  status: "submitted";
  submittedAt: string;
  completedAt: string;
  duplicate: boolean;
  reconciled: boolean;
  rewardReceipt?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseHomeworkFinalizationReceipt(
  value: unknown,
): HomeworkFinalizationReceipt | null {
  if (!isRecord(value)) return null;
  const format = value.format;
  if (
    format !== "writing_prompt" &&
    format !== "homework_template" &&
    format !== "graded_track"
  ) {
    return null;
  }
  if (
    typeof value.homeworkId !== "string" ||
    value.status !== "submitted" ||
    typeof value.submittedAt !== "string" ||
    typeof value.completedAt !== "string" ||
    typeof value.duplicate !== "boolean" ||
    typeof value.reconciled !== "boolean"
  ) {
    return null;
  }
  const rewardReceipt = isRecord(value.rewardReceipt)
    ? value.rewardReceipt
    : undefined;
  return {
    homeworkId: value.homeworkId,
    format,
    status: "submitted",
    submittedAt: value.submittedAt,
    completedAt: value.completedAt,
    duplicate: value.duplicate,
    reconciled: value.reconciled,
    ...(rewardReceipt ? { rewardReceipt } : {}),
  };
}
