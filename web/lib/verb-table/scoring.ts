import { normalizePictureClozeAnswer } from "@/lib/picture-cloze/scoring";
import type {
  VerbFormColumn,
  VerbTablePlayable,
  VerbTableRow,
} from "@/lib/verb-table/types";

/** Reuse light answer normalization (trim, collapse spaces, strip punctuation). */
export function normalizeVerbTableAnswer(value: string): string {
  return normalizePictureClozeAnswer(value);
}

export function verbTableCellId(rowId: string, column: VerbFormColumn): string {
  return `${rowId}:${column}`;
}

export function isVerbTableCellCorrect(
  value: string,
  expected: string,
): boolean {
  const accepted = expected
    .split("/")
    .map((part) => normalizeVerbTableAnswer(part))
    .filter(Boolean);
  return accepted.includes(normalizeVerbTableAnswer(value));
}

export function scoreVerbTableAnswers(
  rows: readonly VerbTableRow[],
  answers: Record<string, string>,
): { correct: number; total: number } {
  let correct = 0;
  let total = 0;
  for (const row of rows) {
    for (const column of row.missing) {
      total += 1;
      if (isVerbTableCellCorrect(answers[verbTableCellId(row.id, column)] ?? "", row.forms[column])) {
        correct += 1;
      }
    }
  }
  return { correct, total };
}

export function scoreVerbTablePlayable(
  activity: VerbTablePlayable,
  answers: Record<string, string>,
): { correct: number; total: number } {
  return scoreVerbTableAnswers(activity.rows, answers);
}
