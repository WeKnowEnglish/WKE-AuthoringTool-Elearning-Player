export type LiveGameReportEndReason = "objective_completed" | "timeout" | "host_ended_early";
export type LiveGameReportBank = "harvest" | "deposit" | "craft";
export type LiveGameReportQuestionType = "multiple_choice" | "deposit_spell" | "drag_sentence";
export type LiveGameEncounterResolution = "open" | "correct" | "unresolved" | "skipped" | "expired" | "abandoned";

export type LiveGameReportRoundRow = {
  id: string;
  room_id: string;
  join_code: string;
  round_number: number;
  status: "active" | "completed";
  class_id: string | null;
  class_title: string | null;
  question_set_title: string;
  level: string;
  topic: string;
  learning_objective: string;
  end_reason: LiveGameReportEndReason;
  summary: Record<string, unknown>;
  started_at: string;
  ended_at: string;
};

export type LiveGameReportParticipantRow = {
  player_id: string;
  display_name: string;
  role: "host" | "player";
};

export type LiveGameEncounterRow = {
  id: string;
  round_id: string;
  challenge_id: string;
  player_id: string;
  question_id: string;
  question_bank: LiveGameReportBank;
  question_type: LiveGameReportQuestionType;
  question_prompt: string;
  correct_answer: unknown;
  learning_target_key: string;
  learning_target_label: string;
  cefr_level: string | null;
  game_action_type: LiveGameReportBank;
  game_object_id: string;
  resource_type: string | null;
  recipe_id: string | null;
  opened_at: string;
  resolved_at: string | null;
  resolution: LiveGameEncounterResolution;
  system_hints_used: number;
  teacher_support_level: number;
  help_requested_at: string | null;
};

export type LiveGameAttemptRow = {
  encounter_id: string;
  submission_id: string;
  submission_index: number;
  selected_answer: unknown;
  is_correct: boolean;
  response_time_ms: number | null;
  contribution: Record<string, unknown>;
  submitted_at: string;
};

export type LiveGameQuestionOutcome = {
  challengeId: string;
  questionId: string;
  bank: LiveGameReportBank;
  questionType: LiveGameReportQuestionType;
  prompt: string;
  correctAnswer: string;
  learningTargetLabel: string;
  actionContext: string;
  status: "first_try" | "after_practice" | "supported" | "keep_practicing" | "skipped" | "not_completed";
  answers: Array<{ selectedAnswer: string; correct: boolean }>;
};

export type LiveGameLearningBreakdown = {
  key: string;
  label: string;
  encounters: number;
  firstTry: number;
  independent: number;
  supported: number;
  unresolved: number;
  firstTryPercent: number | null;
  action: "secure" | "practice" | "reteach" | "insufficient_evidence";
};

export type LiveGameContributionSummary = {
  harvested: Record<string, number>;
  deposited: Record<string, number>;
  crafted: Record<string, number>;
};

export type LiveGameTeamSummary = {
  participantCount: number;
  totalEncounters: number;
  totalSubmissions: number;
  independentCompletions: number;
  supportedCompletions: number;
  unresolvedEncounters: number;
  contributions: LiveGameContributionSummary;
  finalResources: Record<string, number>;
};

export type LiveGamePersonalSummary = {
  totalSubmissions: number;
  correctSubmissions: number;
  accuracyPercent: number | null;
  questionsSolved: number;
  firstTrySolved: number;
  independentSolved: number;
  supportedSolved: number;
  unresolvedEncounters: number;
  averageResponseTimeMs: number | null;
  contributions: LiveGameContributionSummary;
  strengths: string[];
  practiceTargets: string[];
  targets: LiveGameLearningBreakdown[];
  questionTypes: LiveGameLearningBreakdown[];
  questions: LiveGameQuestionOutcome[];
};

export type LiveGameStudentDiagnostic = {
  playerId: string;
  displayName: string;
  totalEncounters: number;
  firstTry: number;
  independent: number;
  supported: number;
  unresolved: number;
  accuracyPercent: number | null;
  targetsNeedingSupport: string[];
  contributions: LiveGameContributionSummary;
};

export type LiveGameQuestionDiagnostic = {
  questionId: string;
  prompt: string;
  bank: LiveGameReportBank;
  encounters: number;
  incorrectSubmissionPercent: number;
  averageAttempts: number;
  averageResponseTimeMs: number | null;
  unresolvedPercent: number;
  supportRequests: number;
  signal: "review" | "watch" | "clear";
  reasons: string[];
};

type LiveGameReportBase = {
  version: 2;
  sessionId: string;
  classId: string | null;
  classTitle: string | null;
  roundNumber: number;
  questionSetTitle: string;
  level: string;
  topic: string;
  learningObjective: string;
  endReason: LiveGameReportEndReason;
  endedAt: string;
  team: LiveGameTeamSummary;
};

export type LiveGameStudentReport = LiveGameReportBase & {
  role: "student";
  personal: LiveGamePersonalSummary;
};

export type LiveGameHostReport = LiveGameReportBase & {
  role: "host";
  teacher: LiveGameStudentDiagnostic | null;
  students: LiveGameStudentDiagnostic[];
  targets: LiveGameLearningBreakdown[];
  questionTypes: LiveGameLearningBreakdown[];
  questionDiagnostics: LiveGameQuestionDiagnostic[];
};

export type LiveGameReport = LiveGameStudentReport | LiveGameHostReport;
