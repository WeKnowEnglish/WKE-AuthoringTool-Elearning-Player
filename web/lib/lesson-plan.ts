/** Max chars for lesson_plan body (safety for DB + prompts). */
export const LESSON_PLAN_MAX_CHARS = 50_000;

export function normalizeLessonPlanText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trimEnd().slice(0, LESSON_PLAN_MAX_CHARS);
}
