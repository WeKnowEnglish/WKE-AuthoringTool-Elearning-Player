/** Max objectives per lesson; max chars per objective (after trim). */
export const LEARNING_GOALS_MAX_COUNT = 20;
export const LEARNING_GOALS_MAX_LENGTH = 500;

/**
 * Normalize learning goals from raw strings (e.g. form rows).
 * Trims, drops empties, removes consecutive duplicate case-insensitive entries, caps count and length.
 */
export function normalizeLearningGoals(raw: string[]): string[] {
  const out: string[] = [];
  let prevLower: string | null = null;
  for (const s of raw) {
    const t = s.trim().slice(0, LEARNING_GOALS_MAX_LENGTH);
    if (!t) continue;
    const lower = t.toLowerCase();
    if (prevLower === lower) continue;
    prevLower = lower;
    out.push(t);
    if (out.length >= LEARNING_GOALS_MAX_COUNT) break;
  }
  return out;
}

/** Parse JSONB / unknown from DB into a string array. */
export function parseLearningGoalsFromDb(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const t = item.trim().slice(0, LEARNING_GOALS_MAX_LENGTH);
      if (t) out.push(t);
    }
  }
  return normalizeLearningGoals(out);
}
