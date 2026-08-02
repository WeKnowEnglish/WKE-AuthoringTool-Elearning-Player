export type HomeworkTemplatePartSnapshot = {
  answers: Record<string, string>;
  correct: number | null;
  total: number;
};

export type HomeworkTemplateSubmissionContent = {
  schemaVersion: 1;
  parts: Record<string, HomeworkTemplatePartSnapshot>;
};

export type HomeworkTemplateSubmission = {
  id: string;
  homeworkId: string;
  studentId: string;
  status: "in_progress" | "submitted";
  content: HomeworkTemplateSubmissionContent;
  submittedAt: string | null;
  updatedAt: string;
};

export function emptyHomeworkTemplateSubmissionContent(): HomeworkTemplateSubmissionContent {
  return { schemaVersion: 1, parts: {} };
}

export function normalizeHomeworkTemplatePartSnapshot(value: unknown): HomeworkTemplatePartSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const answers = Object.fromEntries(Object.entries(row.answers && typeof row.answers === "object" ? row.answers as Record<string, unknown> : {})
    .filter(([, answer]) => typeof answer === "string")
    .slice(0, 100)
    .map(([id, answer]) => [id.slice(0, 100), String(answer).slice(0, 2000)]));
  const total = Number.isFinite(row.total) ? Math.max(0, Math.min(100, Math.round(Number(row.total)))) : Object.keys(answers).length;
  const correct = row.correct === null ? null : Number.isFinite(row.correct) ? Math.max(0, Math.min(total, Math.round(Number(row.correct)))) : null;
  return { answers, correct, total };
}

export function normalizeHomeworkTemplateSubmissionContent(value: unknown): HomeworkTemplateSubmissionContent {
  if (!value || typeof value !== "object") return emptyHomeworkTemplateSubmissionContent();
  const row = value as Record<string, unknown>;
  const rawParts = row.parts && typeof row.parts === "object" ? row.parts as Record<string, unknown> : {};
  const parts: Record<string, HomeworkTemplatePartSnapshot> = {};
  for (const [id, part] of Object.entries(rawParts).slice(0, 6)) {
    const normalized = normalizeHomeworkTemplatePartSnapshot(part);
    if (normalized) parts[id.slice(0, 100)] = normalized;
  }
  return { schemaVersion: 1, parts };
}
