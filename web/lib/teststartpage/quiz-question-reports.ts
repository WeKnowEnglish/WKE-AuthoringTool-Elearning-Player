/**
 * Temporary QA tool: log misaligned / bad test-start quiz questions in localStorage.
 */

import type { TestStartQuizQuestion, TestStartTopicId } from "./bank";

export type QuizQuestionReportCategory = "mistopic" | "other";

export type QuizQuestionReport = {
  id: string;
  createdAt: string;
  category: QuizQuestionReportCategory;
  /** Optional teacher note (e.g. what went wrong). */
  note: string;
  topicId: TestStartTopicId;
  topicLabel: string;
  quizSeed: string;
  questionIndex: number;
  questionCount: number;
  difficultyLevel: number;
  subtype: TestStartQuizQuestion["subtype"];
  /** Short human-readable line for spreadsheets / triage. */
  snapshot: string;
};

const STORAGE_KEY = "we-know:teststart:quiz-question-reports";
const MAX_ENTRIES = 250;

function safeParse(raw: string | null): QuizQuestionReport[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x) => x && typeof x === "object" && "id" in x && "category" in x) as QuizQuestionReport[];
  } catch {
    return [];
  }
}

export function loadQuizQuestionReports(): QuizQuestionReport[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveQuizQuestionReports(reports: QuizQuestionReport[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // quota / private mode
  }
}

export function appendQuizQuestionReport(
  partial: Omit<QuizQuestionReport, "id" | "createdAt">,
): QuizQuestionReport {
  const entry: QuizQuestionReport = {
    ...partial,
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `r-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadQuizQuestionReports()].slice(0, MAX_ENTRIES);
  saveQuizQuestionReports(next);
  return entry;
}

export function clearQuizQuestionReports(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function summarizeQuizQuestionForReport(q: TestStartQuizQuestion): string {
  switch (q.subtype) {
    case "mc_quiz":
      return (q.question ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
    case "fill_blanks":
      return (q.template ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
    case "letter_mixup": {
      const it = q.items?.[0];
      const tw = it?.target_word ?? "";
      const hint = it?.hint ?? "";
      const prompt = q.prompt ?? "";
      return [`letter_mixup`, prompt, tw, hint].filter(Boolean).join(" · ").slice(0, 600);
    }
    default:
      return "unknown";
  }
}

export function countReportsByCategory(reports: QuizQuestionReport[]): Record<QuizQuestionReportCategory, number> {
  const out: Record<QuizQuestionReportCategory, number> = { mistopic: 0, other: 0 };
  for (const r of reports) {
    out[r.category] = (out[r.category] ?? 0) + 1;
  }
  return out;
}

export function exportReportsAsJson(reports: QuizQuestionReport[]): string {
  return JSON.stringify(reports, null, 2);
}
