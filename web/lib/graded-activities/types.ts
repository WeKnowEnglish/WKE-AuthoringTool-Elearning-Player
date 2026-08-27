/** Shared grading contracts used by frozen homework and Lesson Player runs. */

export const GRADED_ACTIVITY_MANIFEST_VERSION = 1 as const;
export const GRADED_ACTIVITY_OUTCOME_VERSION = 1 as const;

export type GradedActivityPolicy =
  | "automatic"
  | "completion"
  | "teacher_review"
  | "ungraded";

export type GradedActivityManifestItem = {
  itemId: string;
  required: boolean;
  maxScore: number;
};

export type GradedActivityManifestPart = {
  partId: string;
  label: string;
  format: string;
  contentVersion: number;
  gradingPolicy: GradedActivityPolicy;
  required: boolean;
  maxScore: number;
  items: GradedActivityManifestItem[];
};

export type GradedTrackManifest = {
  version: typeof GRADED_ACTIVITY_MANIFEST_VERSION;
  trackId: string;
  parts: GradedActivityManifestPart[];
};

export type GradedActivityResponse =
  | string
  | number
  | boolean
  | null
  | GradedActivityResponse[]
  | { [key: string]: GradedActivityResponse };

export type GradedActivityAttemptEvent = {
  version: typeof GRADED_ACTIVITY_OUTCOME_VERSION;
  lessonId: string;
  screenId: string;
  partId: string;
  itemId: string;
  format: string;
  response: GradedActivityResponse;
  passed: boolean;
  attemptNumber: number;
  occurredAt: string;
};

export type GradedActivityScreenOutcome = {
  passed: boolean;
  wrongAttempts: number;
  /** Optional for legacy report callers that only stored pass/retry totals. */
  attempts?: GradedActivityAttemptEvent[];
};

export type GradedActivityRunResult = {
  version: typeof GRADED_ACTIVITY_OUTCOME_VERSION;
  lessonId: string;
  completedAt: string;
  attempts: GradedActivityAttemptEvent[];
  summary: {
    itemCount: number;
    completedCount: number;
    firstTryCorrect: number;
    retries: number;
  };
};
