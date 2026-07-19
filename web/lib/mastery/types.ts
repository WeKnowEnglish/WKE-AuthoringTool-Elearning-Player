import type { StudentResponseKind } from "@/lib/student-session";

export type LearningTargetType =
  | "word"
  | "phrase"
  | "grammar"
  | "strand"
  | "skill"
  | "standard"
  | "learning_goal";

export type LearningTargetRef = {
  type: LearningTargetType;
  key: string;
  label?: string;
};

export type EvidenceSource =
  | "lesson"
  | "vocab_set"
  | "board_game"
  | "story_scene"
  | "pet_game"
  | "teacher_assigned"
  | "whiteboard";

export type EvidenceMode = "recognition" | "recall" | "production" | "transfer";

export type ScaffoldingLevel = "high" | "medium" | "low";

export type ActivityMode = "learn" | "practice" | "review" | "assessment" | "play";

export type LearningEvidenceEvent = {
  id: string;
  studentId: string;
  sessionId: string;
  occurredAt: string;
  source: EvidenceSource;
  activityId: string;
  itemId?: string;
  targetRefs: LearningTargetRef[];
  skillRefs?: LearningTargetRef[];
  response: {
    kind: StudentResponseKind;
    success: boolean;
    firstTry: boolean;
    attempts: number;
    hintLevel?: number;
    timeToAnswerMs?: number;
    errorCode?: string;
  };
  context?: {
    cefr?: string;
    difficulty?: number;
    scaffoldingLevel?: ScaffoldingLevel;
    evidenceMode?: EvidenceMode;
    activityMode?: ActivityMode;
    strandIds?: string[];
  };
};

export type MasteryState =
  | "new"
  | "introduced"
  | "practicing"
  | "developing"
  | "secure"
  | "needs_review"
  | "stuck";

export type StudentMasteryRecord = {
  studentId: string;
  targetKey: string;
  targetType: LearningTargetType;
  targetLabel?: string;
  state: MasteryState;
  masteryScore: number;
  confidence: number;
  exposureCount: number;
  retrievalSuccessCount: number;
  retrievalFailureCount: number;
  firstTrySuccessCount: number;
  lastSeenAt: string | null;
  lastSuccessAt: string | null;
  nextReviewAt: string | null;
  commonErrorCodes: string[];
  scaffoldingNeeded: ScaffoldingLevel;
  updatedAt: string;
};
