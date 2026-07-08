import { resolveStudentStorageIdSync } from "@/lib/auth/student-storage-id";

export const WORD_PROGRESS_STORAGE_KEY_PREFIX = "secondary-vocab-word-progress-v1:";
export const STUDENT_ID_STORAGE_KEY = "secondary-vocab-student-id-v1";
export const SESSION_STORAGE_KEY_PREFIX = "secondary-vocab-today-session-v2:";
export const COMPLETION_STORAGE_KEY_PREFIX = "secondary-vocab-today-completion-v1:";

/** @deprecated Guest-only fallback; prefer {@link resolveStudentStorageIdSync}. */
export function resolveSecondaryStudentId(): string {
  return resolveStudentStorageIdSync();
}

export function getWordProgressStorageKey(studentId: string): string {
  return `${WORD_PROGRESS_STORAGE_KEY_PREFIX}${studentId}`;
}
