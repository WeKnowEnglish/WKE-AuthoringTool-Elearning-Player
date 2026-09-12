import { scopedLocalStorageKey } from "@/lib/auth/scoped-local-storage";

export const HOMEWORK_WRITING_DRAFT_KEY = "wke-homework-writing-draft-v1";

export type HomeworkWritingLocalDraft = {
  text: string;
  updatedAt: string;
};

export function homeworkWritingDraftKey(studentId: string, homeworkId: string): string {
  return scopedLocalStorageKey(
    `${HOMEWORK_WRITING_DRAFT_KEY}:${homeworkId}`,
    studentId,
  );
}

export function readHomeworkWritingDraft(
  studentId: string,
  homeworkId: string,
): HomeworkWritingLocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      homeworkWritingDraftKey(studentId, homeworkId),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HomeworkWritingLocalDraft>;
    if (typeof parsed.text !== "string" || typeof parsed.updatedAt !== "string") {
      return null;
    }
    return { text: parsed.text, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

export function writeHomeworkWritingDraft(
  studentId: string,
  homeworkId: string,
  text: string,
  updatedAt = new Date().toISOString(),
): void {
  if (typeof window === "undefined") return;
  try {
    const key = homeworkWritingDraftKey(studentId, homeworkId);
    if (!text) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify({ text, updatedAt }));
  } catch {
    // Draft recovery must never interrupt typing.
  }
}

export function clearHomeworkWritingDraft(studentId: string, homeworkId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(homeworkWritingDraftKey(studentId, homeworkId));
  } catch {
    // Draft cleanup must never interrupt a successful save.
  }
}
