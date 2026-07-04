import type {
  EvidenceMode,
  LearningEvidenceEvent,
  LearningTargetRef,
  ScaffoldingLevel,
  StudentMasteryRecord,
} from "@/lib/mastery/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeKeyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function learningTargetKey(ref: LearningTargetRef): string {
  return `${ref.type}:${normalizeKeyPart(ref.key) || "unknown"}`;
}

export function createEmptyMasteryRecord(input: {
  studentId: string;
  target: LearningTargetRef;
  now?: Date;
}): StudentMasteryRecord {
  const nowIso = (input.now ?? new Date()).toISOString();
  return {
    studentId: input.studentId,
    targetKey: learningTargetKey(input.target),
    targetType: input.target.type,
    targetLabel: input.target.label,
    state: "new",
    masteryScore: 0,
    confidence: 0,
    exposureCount: 0,
    retrievalSuccessCount: 0,
    retrievalFailureCount: 0,
    firstTrySuccessCount: 0,
    lastSeenAt: null,
    lastSuccessAt: null,
    nextReviewAt: null,
    commonErrorCodes: [],
    scaffoldingNeeded: "medium",
    updatedAt: nowIso,
  };
}

function evidenceModeWeight(mode: EvidenceMode | undefined): number {
  switch (mode) {
    case "recognition":
      return 0.75;
    case "production":
      return 1.2;
    case "transfer":
      return 1.35;
    case "recall":
    default:
      return 1;
  }
}

function scaffoldingWeight(level: ScaffoldingLevel | undefined): number {
  switch (level) {
    case "high":
      return 0.65;
    case "low":
      return 1.15;
    case "medium":
    default:
      return 1;
  }
}

function nextReviewDate(state: StudentMasteryRecord["state"], score: number, now: Date): string {
  let days = 1;
  if (state === "secure") days = score >= 0.9 ? 14 : 7;
  else if (state === "developing") days = 4;
  else if (state === "practicing") days = 2;
  else if (state === "needs_review" || state === "stuck") days = 0;
  return new Date(now.getTime() + days * MS_PER_DAY).toISOString();
}

function nextState(record: StudentMasteryRecord, score: number): StudentMasteryRecord["state"] {
  const attempts = record.retrievalSuccessCount + record.retrievalFailureCount;
  const failureRatio = attempts > 0 ? record.retrievalFailureCount / attempts : 0;

  if (record.retrievalFailureCount >= 3 && failureRatio >= 0.6 && score < 0.45) {
    return "stuck";
  }

  if (record.state === "secure" && record.retrievalFailureCount > 0 && score < 0.7) {
    return "needs_review";
  }

  if (failureRatio >= 0.5 && attempts >= 4 && score < 0.65) {
    return "needs_review";
  }

  if (score >= 0.72 && record.retrievalSuccessCount >= 3 && record.firstTrySuccessCount >= 2) {
    return "secure";
  }
  if (score >= 0.5) return "developing";
  if (score >= 0.25) return "practicing";
  if (record.exposureCount > 0) return "introduced";
  return "new";
}

function scaffoldingNeeded(record: StudentMasteryRecord): ScaffoldingLevel {
  const attempts = record.retrievalSuccessCount + record.retrievalFailureCount;
  const failureRatio = attempts > 0 ? record.retrievalFailureCount / attempts : 0;
  if (record.state === "stuck" || failureRatio >= 0.55) return "high";
  if (record.state === "secure" || record.masteryScore >= 0.75) return "low";
  return "medium";
}

function commonErrorCodes(
  current: string[],
  errorCode: string | undefined,
  success: boolean,
): string[] {
  if (success || !errorCode?.trim()) return current;
  return Array.from(new Set([...current, errorCode.trim()])).slice(-5);
}

export function applyEvidenceToMastery(
  record: StudentMasteryRecord,
  evidence: LearningEvidenceEvent,
): StudentMasteryRecord {
  const occurredAt = new Date(evidence.occurredAt);
  const now = Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt;
  const scaffolding = evidence.context?.scaffoldingLevel;
  const mode = evidence.context?.evidenceMode;
  const hintPenalty = Math.max(0, evidence.response.hintLevel ?? 0) * 0.02;
  const attemptsPenalty = Math.max(0, evidence.response.attempts - 1) * 0.02;
  const quality = Math.max(
    0.25,
    scaffoldingWeight(scaffolding) * evidenceModeWeight(mode) - hintPenalty - attemptsPenalty,
  );
  const firstTryBonus = evidence.response.firstTry ? 0.03 : 0;
  const successDelta = (0.13 + firstTryBonus) * quality;
  const failureDelta = (0.1 + attemptsPenalty + hintPenalty) / Math.max(0.7, quality);
  const masteryScore =
    evidence.response.success ?
      clamp01(record.masteryScore + successDelta)
    : clamp01(record.masteryScore - failureDelta);

  const next: StudentMasteryRecord = {
    ...record,
    targetLabel: record.targetLabel,
    masteryScore,
    exposureCount: record.exposureCount + 1,
    retrievalSuccessCount: record.retrievalSuccessCount + (evidence.response.success ? 1 : 0),
    retrievalFailureCount: record.retrievalFailureCount + (evidence.response.success ? 0 : 1),
    firstTrySuccessCount:
      record.firstTrySuccessCount +
      (evidence.response.success && evidence.response.firstTry ? 1 : 0),
    lastSeenAt: now.toISOString(),
    lastSuccessAt: evidence.response.success ? now.toISOString() : record.lastSuccessAt,
    commonErrorCodes: commonErrorCodes(
      record.commonErrorCodes,
      evidence.response.errorCode,
      evidence.response.success,
    ),
    confidence: clamp01(record.confidence + 0.08 * quality),
    updatedAt: now.toISOString(),
  };
  next.state = nextState(next, next.masteryScore);
  next.scaffoldingNeeded = scaffoldingNeeded(next);
  next.nextReviewAt = nextReviewDate(next.state, next.masteryScore, now);
  return next;
}

export function applyEvidenceToMasteryRecords(
  records: Record<string, StudentMasteryRecord>,
  evidence: LearningEvidenceEvent,
): Record<string, StudentMasteryRecord> {
  const next = { ...records };
  const refs = [...evidence.targetRefs, ...(evidence.skillRefs ?? [])];
  for (const ref of refs) {
    const key = learningTargetKey(ref);
    const existing =
      next[key] ??
      createEmptyMasteryRecord({
        studentId: evidence.studentId,
        target: ref,
        now: new Date(evidence.occurredAt),
      });
    next[key] = applyEvidenceToMastery(
      {
        ...existing,
        targetLabel: existing.targetLabel ?? ref.label,
      },
      evidence,
    );
  }
  return next;
}

