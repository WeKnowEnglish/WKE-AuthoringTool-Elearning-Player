export type HomeworkTemplatePartGrade = {
  score: number;
  maxScore: number;
  feedback: string;
};

export type HomeworkTemplateReview = {
  grades: Record<string, HomeworkTemplatePartGrade>;
  feedback: string;
  reviewedAt: string;
};

export function normalizeHomeworkTemplatePartGrade(value: unknown): HomeworkTemplatePartGrade | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const maxScore = Number.isFinite(row.maxScore)
    ? Math.max(0, Math.min(100, Math.round(Number(row.maxScore))))
    : null;
  const score = Number.isFinite(row.score)
    ? Math.max(0, Math.min(100, Math.round(Number(row.score))))
    : null;
  if (maxScore === null || score === null || score > maxScore) return null;
  return {
    score,
    maxScore,
    feedback: typeof row.feedback === "string" ? row.feedback.trim().slice(0, 500) : "",
  };
}

export function normalizeHomeworkTemplateGrades(value: unknown): Record<string, HomeworkTemplatePartGrade> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const grades: Record<string, HomeworkTemplatePartGrade> = {};
  for (const [partId, grade] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
    const normalized = normalizeHomeworkTemplatePartGrade(grade);
    if (normalized) grades[partId.slice(0, 100)] = normalized;
  }
  return grades;
}
