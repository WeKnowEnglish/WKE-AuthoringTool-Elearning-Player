import type {
  EvidenceMode,
  LearningTargetRef,
  ScaffoldingLevel,
  StudentMasteryRecord,
} from "@/lib/mastery/types";
import type { StudentResponseKind } from "@/lib/student-session";

export const LEARNING_STRAND_IDS = [
  "meaning_focused_input",
  "meaning_focused_output",
  "language_focused_learning",
  "fluency_development",
] as const;

export type LearningStrandId = (typeof LEARNING_STRAND_IDS)[number];

export type LearningStrandDefinition = {
  id: LearningStrandId;
  label: string;
  shortLabel: string;
  learnerPurpose: string;
  adaptiveSignal: string;
};

export type StrandRubricLevelId =
  | "not_enough_evidence"
  | "emerging"
  | "developing"
  | "secure"
  | "extending";

export type StrandRubricLevel = {
  id: StrandRubricLevelId;
  label: string;
  scoreRange: readonly [number, number];
  teacherMeaning: string;
  nextMove: string;
};

export type LearningStrandAssessment = {
  strandId: LearningStrandId;
  strandLabel: string;
  level: StrandRubricLevel;
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  successCount: number;
  failureCount: number;
  firstTrySuccessCount: number;
  scaffoldingNeeded: ScaffoldingLevel;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
};

export const LEARNING_STRANDS: Record<LearningStrandId, LearningStrandDefinition> = {
  meaning_focused_input: {
    id: "meaning_focused_input",
    label: "Meaning-Focused Input",
    shortLabel: "Input",
    learnerPurpose: "Understand messages through listening and reading.",
    adaptiveSignal:
      "The student is building comprehension from mostly familiar language.",
  },
  meaning_focused_output: {
    id: "meaning_focused_output",
    label: "Meaning-Focused Output",
    shortLabel: "Output",
    learnerPurpose: "Use English to communicate ideas through speaking and writing.",
    adaptiveSignal:
      "The student is producing language and revealing gaps in vocabulary or grammar.",
  },
  language_focused_learning: {
    id: "language_focused_learning",
    label: "Language-Focused Learning",
    shortLabel: "Study",
    learnerPurpose: "Study vocabulary, grammar, spelling, pronunciation, and form.",
    adaptiveSignal:
      "The student is deliberately practicing a language feature or correction.",
  },
  fluency_development: {
    id: "fluency_development",
    label: "Fluency Development",
    shortLabel: "Fluency",
    learnerPurpose: "Use known language faster, more smoothly, and more accurately.",
    adaptiveSignal:
      "The student is practicing familiar language with speed or automaticity pressure.",
  },
};

export const STRAND_RUBRIC_LEVELS: Record<StrandRubricLevelId, StrandRubricLevel> = {
  not_enough_evidence: {
    id: "not_enough_evidence",
    label: "Not enough evidence",
    scoreRange: [0, 1],
    teacherMeaning: "The student has not produced enough evidence in this strand yet.",
    nextMove: "Offer a low-stakes activity in this strand and collect more evidence.",
  },
  emerging: {
    id: "emerging",
    label: "Emerging",
    scoreRange: [0, 0.34],
    teacherMeaning: "The student is beginning this strand and needs substantial support.",
    nextMove: "Use high scaffolding, familiar language, modeling, and short practice cycles.",
  },
  developing: {
    id: "developing",
    label: "Developing",
    scoreRange: [0.35, 0.64],
    teacherMeaning:
      "The student can work in this strand with support, but performance is not yet stable.",
    nextMove: "Continue guided practice and vary examples while keeping the task achievable.",
  },
  secure: {
    id: "secure",
    label: "Secure",
    scoreRange: [0.65, 0.84],
    teacherMeaning:
      "The student usually performs successfully in this strand with moderate or low support.",
    nextMove: "Maintain spaced review and begin asking for more independence or transfer.",
  },
  extending: {
    id: "extending",
    label: "Extending",
    scoreRange: [0.85, 1],
    teacherMeaning:
      "The student is ready for richer, faster, or more independent work in this strand.",
    nextMove: "Offer challenge tasks, authentic communication, and transfer across contexts.",
  },
};

export type ActivityLearningMetadata = {
  activityId: string;
  title: string;
  activityKind: string;
  cefr?: string;
  estimatedDurationSec?: number;
  targets: LearningTargetRef[];
  skills?: LearningTargetRef[];
  strands: LearningStrandId[];
  prerequisites?: LearningTargetRef[];
  evidenceMode: EvidenceMode;
  defaultScaffoldingLevel: ScaffoldingLevel;
};

export function isLearningStrandId(value: string): value is LearningStrandId {
  return (LEARNING_STRAND_IDS as readonly string[]).includes(value);
}

export function learningStrandTargetRef(id: LearningStrandId): LearningTargetRef {
  const strand = LEARNING_STRANDS[id];
  return {
    type: "strand",
    key: id,
    label: strand.label,
  };
}

export function learningStrandTargetRefs(ids: LearningStrandId[]): LearningTargetRef[] {
  return Array.from(new Set(ids)).map(learningStrandTargetRef);
}

export function strandMasteryTargetKey(id: LearningStrandId): string {
  return `strand:${id}`;
}

export function rubricLevelForStrandMastery(input: {
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
}): StrandRubricLevel {
  if (input.evidenceCount < 3 || input.confidence < 0.18) {
    return STRAND_RUBRIC_LEVELS.not_enough_evidence;
  }
  if (input.masteryScore >= 0.85) return STRAND_RUBRIC_LEVELS.extending;
  if (input.masteryScore >= 0.65) return STRAND_RUBRIC_LEVELS.secure;
  if (input.masteryScore >= 0.35) return STRAND_RUBRIC_LEVELS.developing;
  return STRAND_RUBRIC_LEVELS.emerging;
}

export function assessLearningStrand(input: {
  strandId: LearningStrandId;
  record?: StudentMasteryRecord | null;
}): LearningStrandAssessment {
  const strand = LEARNING_STRANDS[input.strandId];
  const record = input.record;
  const evidenceCount = record?.exposureCount ?? 0;
  const masteryScore = record?.masteryScore ?? 0;
  const confidence = record?.confidence ?? 0;
  return {
    strandId: input.strandId,
    strandLabel: strand.label,
    level: rubricLevelForStrandMastery({
      masteryScore,
      confidence,
      evidenceCount,
    }),
    masteryScore,
    confidence,
    evidenceCount,
    successCount: record?.retrievalSuccessCount ?? 0,
    failureCount: record?.retrievalFailureCount ?? 0,
    firstTrySuccessCount: record?.firstTrySuccessCount ?? 0,
    scaffoldingNeeded: record?.scaffoldingNeeded ?? "medium",
    lastSeenAt: record?.lastSeenAt ?? null,
    nextReviewAt: record?.nextReviewAt ?? null,
  };
}

export function assessLearningStrands(input: {
  records: Record<string, StudentMasteryRecord>;
}): LearningStrandAssessment[] {
  return LEARNING_STRAND_IDS.map((strandId) =>
    assessLearningStrand({
      strandId,
      record: input.records[strandMasteryTargetKey(strandId)],
    }),
  );
}

export function weakestLearningStrands(
  assessments: LearningStrandAssessment[],
): LearningStrandAssessment[] {
  return [...assessments].sort(
    (a, b) =>
      a.masteryScore - b.masteryScore ||
      a.confidence - b.confidence ||
      a.strandLabel.localeCompare(b.strandLabel),
  );
}

export function inferLearningStrandsForEvidence(input: {
  evidenceMode: EvidenceMode;
  responseKind: StudentResponseKind;
  isTimed?: boolean;
  isExplicitLanguagePractice?: boolean;
}): LearningStrandId[] {
  if (input.isTimed) return ["fluency_development"];
  if (input.isExplicitLanguagePractice) return ["language_focused_learning"];

  if (input.evidenceMode === "recognition") {
    return ["meaning_focused_input"];
  }
  if (input.evidenceMode === "production" || input.evidenceMode === "transfer") {
    if (input.responseKind === "speak" || input.responseKind === "type") {
      return ["meaning_focused_output"];
    }
    return ["language_focused_learning"];
  }
  if (input.responseKind === "listen") return ["meaning_focused_input"];
  return ["language_focused_learning"];
}

export function vocabularyStrandsForPractice(input: {
  evidenceMode: EvidenceMode;
  responseKind: StudentResponseKind;
}): LearningStrandId[] {
  if (input.evidenceMode === "recognition") return ["meaning_focused_input"];
  if (input.responseKind === "type") return ["language_focused_learning"];
  return inferLearningStrandsForEvidence({
    evidenceMode: input.evidenceMode,
    responseKind: input.responseKind,
    isExplicitLanguagePractice: true,
  });
}
