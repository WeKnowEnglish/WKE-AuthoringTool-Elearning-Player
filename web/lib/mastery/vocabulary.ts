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
import type { StudentResponseKind } from "@/lib/student-session";
import {
  learningStrandTargetRefs,
  vocabularyStrandsForPractice,
} from "@/lib/learning-strands";

export function createVocabularyLearningTarget(input: {
  wordId: string;
  lemma?: string | null;
}): LearningTargetRef {
  return {
    type: "word",
    key: input.wordId,
    label: input.lemma?.trim() || input.wordId,
  };
}

export function createVocabularyEvidenceEvent(input: {
  studentId: string;
  sessionId: string;
  activityId: string;
  wordId: string;
  lemma?: string | null;
  itemId?: string;
  success: boolean;
  firstTry: boolean;
  attempts: number;
  responseKind: StudentResponseKind;
  evidenceMode: EvidenceMode;
  scaffoldingLevel?: ScaffoldingLevel;
  occurredAt?: Date;
}): LearningEvidenceEvent {
  const occurredAt = input.occurredAt ?? new Date();
  const target = createVocabularyLearningTarget({
    wordId: input.wordId,
    lemma: input.lemma,
  });
  const strandIds = vocabularyStrandsForPractice({
    evidenceMode: input.evidenceMode,
    responseKind: input.responseKind,
  });
  return {
    id: `${input.sessionId}:${input.itemId ?? input.wordId}:${occurredAt.getTime()}:${
      input.success ? "success" : "miss"
    }`,
    studentId: input.studentId,
    sessionId: input.sessionId,
    occurredAt: occurredAt.toISOString(),
    source: "vocab_set",
    activityId: input.activityId,
    itemId: input.itemId ?? input.wordId,
    targetRefs: [target, ...learningStrandTargetRefs(strandIds)],
    response: {
      kind: input.responseKind,
      success: input.success,
      firstTry: input.firstTry,
      attempts: Math.max(1, input.attempts),
    },
    context: {
      scaffoldingLevel: input.scaffoldingLevel ?? "medium",
      evidenceMode: input.evidenceMode,
      activityMode: "practice",
      strandIds,
    },
  };
}

export function recordVocabularyEvidence(input: Parameters<typeof createVocabularyEvidenceEvent>[0]):
  | MasterySnapshot
  | null {
  if (!input.wordId.trim()) return null;
  return recordLearningEvidenceEvent(createVocabularyEvidenceEvent(input));
}
