export type LocalWordStatus =
  | "not_seen"
  | "seen"
  | "correct"
  | "incorrect"
  | "needs_repair"
  | "repaired"
  | "passed";

export type LocalActivityWordState = {
  studentId: string;
  activitySessionId: string;
  wordItemId: string;
  localMasteryScore: number;
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  requiredSuccessfulAttempts: 1 | 2;
  successfulAttempts: number;
  status: LocalWordStatus;
  updatedAt: string;
};

export const LOCAL_CORRECT_DELTA = 0.08;
export const LOCAL_INCORRECT_DELTA = -0.12;
