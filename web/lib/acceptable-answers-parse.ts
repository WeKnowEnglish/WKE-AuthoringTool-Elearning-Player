/**
 * Parse teacher-entered acceptable answers from a textarea.
 * Supports: one answer per line; semicolons within a line for multiple synonyms;
 * if the whole input is a single line with commas (no newlines, no semicolons), split on commas.
 */

export function parseAcceptableAnswersInput(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const hasNewline = /\r?\n/.test(trimmed);
  const hasSemicolon = trimmed.includes(";");

  if (!hasNewline && !hasSemicolon && trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const lines = trimmed.split(/\r\n|\n|\r/);
  const out: string[] = [];
  for (const line of lines) {
    const parts = line.split(";").map((s) => s.trim()).filter(Boolean);
    out.push(...parts);
  }
  return out;
}
