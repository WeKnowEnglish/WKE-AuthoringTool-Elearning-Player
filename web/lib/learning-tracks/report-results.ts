import type { GradedActivityScreenOutcome } from "@/lib/graded-activities/types";
export type TrackScreenOutcome = GradedActivityScreenOutcome;


export type PostQuizReportSummary = {
  total: number;
  completed: number;
  firstTry: number;
  retries: number;
  hasRuntimeResults: boolean;
};

export function summarizePostQuizReport(
  sourceScreenIds: string[],
  outcomes: Record<string, TrackScreenOutcome>,
): PostQuizReportSummary {
  const total = sourceScreenIds.length;
  const completed = sourceScreenIds.filter((id) => outcomes[id]?.passed).length;
  const firstTry = sourceScreenIds.filter(
    (id) => outcomes[id]?.passed && outcomes[id]?.wrongAttempts === 0,
  ).length;
  const retries = sourceScreenIds.reduce(
    (sum, id) => sum + (outcomes[id]?.wrongAttempts ?? 0),
    0,
  );

  return {
    total,
    completed,
    firstTry,
    retries,
    hasRuntimeResults: completed > 0 || retries > 0,
  };
}
