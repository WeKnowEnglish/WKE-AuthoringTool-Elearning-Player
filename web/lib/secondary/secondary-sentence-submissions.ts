export type SecondarySentenceSubmissionStatus =
  | "submitted"
  | "approved"
  | "needs_revision"
  | "superseded";

export type SecondarySentenceSubmissionRow = {
  wordItemId: string;
  status: SecondarySentenceSubmissionStatus;
  submittedAt: string;
};

/** Latest non-superseded row per word (rows should be newest-first). */
export function pickLatestSentenceSubmissionByWordId<
  T extends SecondarySentenceSubmissionRow,
>(rows: T[]): Map<string, T> {
  const sorted = [...rows].sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt),
  );
  const map = new Map<string, T>();

  for (const row of sorted) {
    if (row.status === "superseded") continue;
    if (!map.has(row.wordItemId)) {
      map.set(row.wordItemId, row);
    }
  }

  return map;
}

export function canResubmitSentenceSubmission(
  status: SecondarySentenceSubmissionStatus | undefined,
): boolean {
  return status === "needs_revision";
}

export function countSentenceSubmissionsNeedingResubmit(
  rows: SecondarySentenceSubmissionRow[],
): number {
  const latest = pickLatestSentenceSubmissionByWordId(rows);
  let count = 0;
  for (const row of latest.values()) {
    if (row.status === "needs_revision") count += 1;
  }
  return count;
}
