/**
 * Pure helpers for teacher host setup progressive loading.
 * Kept free of React so unit tests can cover state transitions.
 */

export type HostClassLoadState = "idle" | "loading" | "ready" | "empty" | "error";
export type HostSetsLoadState = "loading" | "ready" | "empty" | "error";

export type TeacherClassOption = { id: string; title: string };

export function resolveHostSetsLoadState(input: {
  loading: boolean;
  error: string | null;
  count: number;
}): HostSetsLoadState {
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (input.count === 0) return "empty";
  return "ready";
}

export function resolveHostClassLoadState(input: {
  requested: boolean;
  loading: boolean;
  error: string | null;
  count: number;
}): HostClassLoadState {
  if (!input.requested) return "idle";
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (input.count === 0) return "empty";
  return "ready";
}

/** Create Room requires a question set; class is never required. */
export function canCreateHostRoom(input: {
  isSubmitting: boolean;
  setsLoading: boolean;
  selectedQuestionSetId: string | null;
  classesLoading: boolean;
}): boolean {
  if (input.isSubmitting) return false;
  if (input.setsLoading) return false;
  if (!input.selectedQuestionSetId) return false;
  // Class loading must never block creation when no class is required.
  void input.classesLoading;
  return true;
}

export function reconcileSelectedClassId(
  current: string,
  available: TeacherClassOption[],
): string {
  if (!current) return "";
  return available.some((entry) => entry.id === current) ? current : "";
}

export function shouldLoadClassesEagerly(initialClassId: string): boolean {
  return Boolean(initialClassId.trim());
}
