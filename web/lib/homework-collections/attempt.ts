import {
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionAttempt,
  type HomeworkCollectionAttemptContent,
  type HomeworkCollectionReview,
  type HomeworkCollectionReviewPart,
  type HomeworkCollectionScoredPart,
} from "@/lib/homework-collections/types";
import {
  homeworkCollectionGradingMode,
  isHomeworkCollectionPartKind,
} from "@/lib/homework-collections/document";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeInt(value: unknown): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(Number(value))) : 0;
}

export function normalizeHomeworkCollectionAttemptContent(
  raw: unknown,
): HomeworkCollectionAttemptContent {
  if (!isRecord(raw) || raw.version !== HOMEWORK_COLLECTION_VERSION || !isRecord(raw.parts)) {
    return { version: HOMEWORK_COLLECTION_VERSION, parts: {} };
  }
  const parts: Record<string, HomeworkCollectionScoredPart> = {};
  for (const [partId, value] of Object.entries(raw.parts).slice(0, 30)) {
    if (!isRecord(value) || !isHomeworkCollectionPartKind(value.kind)) continue;
    const answers = isRecord(value.answers)
      ? Object.fromEntries(
          Object.entries(value.answers)
            .filter(([, answer]) => typeof answer === "string")
            .slice(0, 50)
            .map(([id, answer]) => [id.slice(0, 100), String(answer).slice(0, 10_000)]),
        )
      : {};
    const maxScore = nonNegativeInt(value.maxScore);
    const correct = value.correct === null
      ? null
      : Math.min(maxScore, nonNegativeInt(value.correct));
    parts[partId.slice(0, 100)] = {
      partId: partId.slice(0, 100),
      kind: value.kind,
      gradingMode: homeworkCollectionGradingMode(value.kind),
      answers,
      correct,
      maxScore,
      answered: nonNegativeInt(value.answered),
      itemCount: nonNegativeInt(value.itemCount),
    };
  }
  return { version: HOMEWORK_COLLECTION_VERSION, parts };
}

export function homeworkCollectionAttemptFromRow(row: Record<string, unknown>): HomeworkCollectionAttempt {
  return {
    id: String(row.id),
    homeworkId: String(row.homework_id),
    studentId: String(row.student_id),
    status: row.status === "submitted" ? "submitted" : "in_progress",
    content: normalizeHomeworkCollectionAttemptContent(row.content),
    autoScore: nonNegativeInt(row.auto_score),
    autoMaxScore: nonNegativeInt(row.auto_max_score),
    manualMaxScore: nonNegativeInt(row.manual_max_score),
    submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
    updatedAt: String(row.updated_at),
  };
}

export function normalizeHomeworkCollectionReviewParts(
  raw: unknown,
): Record<string, HomeworkCollectionReviewPart> {
  if (!isRecord(raw)) return {};
  const parts: Record<string, HomeworkCollectionReviewPart> = {};
  for (const [partId, value] of Object.entries(raw).slice(0, 30)) {
    if (!isRecord(value)) continue;
    const maxScore = Math.min(5000, nonNegativeInt(value.maxScore));
    const score = Math.min(maxScore, nonNegativeInt(value.score));
    parts[partId.slice(0, 100)] = {
      score,
      maxScore,
      feedback: typeof value.feedback === "string" ? value.feedback.trim().slice(0, 500) : "",
    };
  }
  return parts;
}

export function homeworkCollectionReviewFromRow(
  row: Record<string, unknown> | null | undefined,
): HomeworkCollectionReview | null {
  if (!row) return null;
  return {
    parts: normalizeHomeworkCollectionReviewParts(row.parts),
    feedback: typeof row.feedback === "string" ? row.feedback : "",
    reviewedAt: String(row.reviewed_at),
  };
}
