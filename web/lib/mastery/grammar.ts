import {
  recordLearningEvidenceEvent,
  type MasterySnapshot,
} from "@/lib/mastery/local-storage";
import type {
  EvidenceMode,
  LearningEvidenceEvent,
  LearningTargetRef,
  ScaffoldingLevel,
} from "@/lib/mastery/types";
import { learningStrandTargetRefs } from "@/lib/learning-strands";

const GRAMMAR_STRAND_IDS = ["language_focused_learning"] as const;

export function createGrammarLearningTarget(input: {
  microSkillId: string;
  label?: string;
}): LearningTargetRef {
  const key = input.microSkillId.trim();
  return {
    type: "grammar",
    key,
    label: input.label?.trim() || key,
  };
}

export function createGrammarEvidenceEvent(input: {
  studentId: string;
  sessionId: string;
  activityId: string;
  itemId: string;
  microSkillId: string;
  label?: string;
  success: boolean;
  firstTry: boolean;
  attempts: number;
  errorCode?: string;
  evidenceMode?: EvidenceMode;
  scaffoldingLevel?: ScaffoldingLevel;
  occurredAt?: Date;
}): LearningEvidenceEvent {
  const occurredAt = input.occurredAt ?? new Date();
  const target = createGrammarLearningTarget({
    microSkillId: input.microSkillId,
    label: input.label,
  });
  const strandIds = [...GRAMMAR_STRAND_IDS];

  return {
    id: `${input.sessionId}:${input.itemId}:${occurredAt.getTime()}:${
      input.success ? "success" : "miss"
    }`,
    studentId: input.studentId,
    sessionId: input.sessionId,
    occurredAt: occurredAt.toISOString(),
    source: "lesson",
    activityId: input.activityId,
    itemId: input.itemId,
    targetRefs: [target, ...learningStrandTargetRefs(strandIds)],
    response: {
      kind: "true_false",
      success: input.success,
      firstTry: input.firstTry,
      attempts: Math.max(1, input.attempts),
      errorCode: input.errorCode,
    },
    context: {
      scaffoldingLevel: input.scaffoldingLevel ?? "medium",
      evidenceMode: input.evidenceMode ?? "recognition",
      activityMode: "practice",
      strandIds,
    },
  };
}

export function recordGrammarEvidence(
  input: Parameters<typeof createGrammarEvidenceEvent>[0],
): MasterySnapshot | null {
  if (!input.microSkillId.trim()) return null;
  return recordLearningEvidenceEvent(createGrammarEvidenceEvent(input));
}

export function grammarPosterActivityId(posterSlug: string): string {
  return `grammar:${posterSlug.trim()}`;
}
