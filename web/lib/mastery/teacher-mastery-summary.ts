import { learningTargetKey } from "@/lib/mastery/engine";
import {
  classifyWordForPractice,
  vocabularyRecommendationReasonLabel,
  type VocabularyRecommendationReason,
} from "@/lib/mastery/recommendations";
import { rowToMasteryRecord, type StudentMasteryRecordRow } from "@/lib/mastery/supabase-rows";
import type {
  LearningTargetType,
  MasteryState,
  StudentMasteryRecord,
} from "@/lib/mastery/types";

export type TeacherMasteryTargetRow = {
  targetKey: string;
  targetType: LearningTargetType;
  targetLabel?: string;
  state: MasteryState;
  masteryScore: number;
  confidence: number;
  exposureCount: number;
  nextReviewAt: string | null;
  lastSeenAt: string | null;
  updatedAt: string;
  practiceReason?: VocabularyRecommendationReason | "new" | "mastered";
  practiceReasonLabel?: string;
};

export type TeacherStudentMasteryDiagnostic = {
  studentId: string;
  recordCount: number;
  countsByType: Partial<Record<LearningTargetType, number>>;
  countsByState: Partial<Record<MasteryState, number>>;
  latestUpdatedAt: string | null;
  weakWords: TeacherMasteryTargetRow[];
  dueReview: TeacherMasteryTargetRow[];
  fragile: TeacherMasteryTargetRow[];
  grammarWeak: TeacherMasteryTargetRow[];
};

export type TeacherClassStudentMasteryPreview = {
  studentId: string;
  recordCount: number;
  weakWordCount: number;
  dueReviewCount: number;
  latestUpdatedAt: string | null;
};

export type TeacherClassMasteryOverview = {
  classId: string;
  students: TeacherClassStudentMasteryPreview[];
};

export type BuildTeacherDiagnosticOptions = {
  now?: Date;
  weakWordLimit?: number;
  grammarWeakLimit?: number;
  fragileLimit?: number;
  dueReviewLimit?: number;
};

const FRAGILE_REASONS = new Set<VocabularyRecommendationReason>([
  "fragile",
  "low_confidence",
]);

export function parseWordIdFromTargetKey(targetKey: string): string | null {
  if (!targetKey.startsWith("word:")) return null;
  const wordId = targetKey.slice("word:".length).trim();
  return wordId || null;
}

export function rowsToMasteryRecords(rows: StudentMasteryRecordRow[]): StudentMasteryRecord[] {
  return rows
    .map((row) => {
      try {
        return rowToMasteryRecord(row);
      } catch {
        return null;
      }
    })
    .filter((record): record is StudentMasteryRecord => record !== null);
}

function toTargetRow(
  record: StudentMasteryRecord,
  practiceReason?: VocabularyRecommendationReason | "new" | "mastered",
): TeacherMasteryTargetRow {
  return {
    targetKey: record.targetKey,
    targetType: record.targetType,
    targetLabel: record.targetLabel,
    state: record.state,
    masteryScore: record.masteryScore,
    confidence: record.confidence,
    exposureCount: record.exposureCount,
    nextReviewAt: record.nextReviewAt,
    lastSeenAt: record.lastSeenAt,
    updatedAt: record.updatedAt,
    practiceReason,
    practiceReasonLabel:
      practiceReason && practiceReason !== "new" && practiceReason !== "mastered" ?
        vocabularyRecommendationReasonLabel(practiceReason)
      : practiceReason === "new" ?
        "new"
      : practiceReason === "mastered" ?
        "mastered"
      : undefined,
  };
}

function wordRecords(records: StudentMasteryRecord[]): StudentMasteryRecord[] {
  return records.filter((record) => record.targetType === "word");
}

function grammarRecords(records: StudentMasteryRecord[]): StudentMasteryRecord[] {
  return records.filter((record) => record.targetType === "grammar");
}

export function pickWeakWordTargets(
  records: StudentMasteryRecord[],
  limit = 10,
): TeacherMasteryTargetRow[] {
  return wordRecords(records)
    .filter((record) => record.exposureCount > 0)
    .sort((a, b) => a.masteryScore - b.masteryScore || a.targetKey.localeCompare(b.targetKey))
    .slice(0, Math.max(0, limit))
    .map((record) => toTargetRow(record));
}

export function pickDueReviewTargets(
  records: StudentMasteryRecord[],
  now = new Date(),
  limit = 10,
): TeacherMasteryTargetRow[] {
  return wordRecords(records)
    .map((record) => {
      const wordId = parseWordIdFromTargetKey(record.targetKey);
      if (!wordId) return null;
      const reason = classifyWordForPractice({ wordId, record, now });
      if (reason !== "due_review") return null;
      return toTargetRow(record, reason);
    })
    .filter((row): row is TeacherMasteryTargetRow => row !== null)
    .sort((a, b) => a.masteryScore - b.masteryScore || a.targetKey.localeCompare(b.targetKey))
    .slice(0, Math.max(0, limit));
}

export function pickFragileTargets(
  records: StudentMasteryRecord[],
  now = new Date(),
  limit = 10,
): TeacherMasteryTargetRow[] {
  return wordRecords(records)
    .map((record) => {
      const wordId = parseWordIdFromTargetKey(record.targetKey);
      if (!wordId) return null;
      const reason = classifyWordForPractice({ wordId, record, now });
      if (
        reason === "due_review" ||
        reason === "new" ||
        reason === "mastered" ||
        reason === null ||
        reason === "developing"
      ) {
        if (record.state === "stuck" || record.state === "needs_review") {
          return toTargetRow(record, "fragile");
        }
        return null;
      }
      if (FRAGILE_REASONS.has(reason)) {
        return toTargetRow(record, reason);
      }
      return null;
    })
    .filter((row): row is TeacherMasteryTargetRow => row !== null)
    .sort((a, b) => a.masteryScore - b.masteryScore || a.targetKey.localeCompare(b.targetKey))
    .slice(0, Math.max(0, limit));
}

export function pickGrammarWeakTargets(
  records: StudentMasteryRecord[],
  limit = 5,
  maxScore = 0.5,
): TeacherMasteryTargetRow[] {
  return grammarRecords(records)
    .filter((record) => record.exposureCount > 0 && record.masteryScore < maxScore)
    .sort((a, b) => a.masteryScore - b.masteryScore || a.targetKey.localeCompare(b.targetKey))
    .slice(0, Math.max(0, limit))
    .map((record) => toTargetRow(record));
}

function countByType(records: StudentMasteryRecord[]): Partial<Record<LearningTargetType, number>> {
  const counts: Partial<Record<LearningTargetType, number>> = {};
  for (const record of records) {
    counts[record.targetType] = (counts[record.targetType] ?? 0) + 1;
  }
  return counts;
}

function countByState(records: StudentMasteryRecord[]): Partial<Record<MasteryState, number>> {
  const counts: Partial<Record<MasteryState, number>> = {};
  for (const record of records) {
    counts[record.state] = (counts[record.state] ?? 0) + 1;
  }
  return counts;
}

function latestUpdatedAt(records: StudentMasteryRecord[]): string | null {
  let latest = "";
  for (const record of records) {
    if (record.updatedAt > latest) latest = record.updatedAt;
  }
  return latest || null;
}

export function buildTeacherStudentMasteryDiagnostic(
  studentId: string,
  records: StudentMasteryRecord[],
  options: BuildTeacherDiagnosticOptions = {},
): TeacherStudentMasteryDiagnostic {
  const now = options.now ?? new Date();
  const weakWordLimit = options.weakWordLimit ?? 10;
  const grammarWeakLimit = options.grammarWeakLimit ?? 5;
  const fragileLimit = options.fragileLimit ?? 10;
  const dueReviewLimit = options.dueReviewLimit ?? 10;

  return {
    studentId,
    recordCount: records.length,
    countsByType: countByType(records),
    countsByState: countByState(records),
    latestUpdatedAt: latestUpdatedAt(records),
    weakWords: pickWeakWordTargets(records, weakWordLimit),
    dueReview: pickDueReviewTargets(records, now, dueReviewLimit),
    fragile: pickFragileTargets(records, now, fragileLimit),
    grammarWeak: pickGrammarWeakTargets(records, grammarWeakLimit),
  };
}

export function buildTeacherClassStudentMasteryPreview(
  studentId: string,
  records: StudentMasteryRecord[],
  options: BuildTeacherDiagnosticOptions = {},
): TeacherClassStudentMasteryPreview {
  const diagnostic = buildTeacherStudentMasteryDiagnostic(studentId, records, options);
  return {
    studentId,
    recordCount: diagnostic.recordCount,
    weakWordCount: diagnostic.weakWords.length,
    dueReviewCount: diagnostic.dueReview.length,
    latestUpdatedAt: diagnostic.latestUpdatedAt,
  };
}

/** Helper for tests — build a word record with a canonical target key. */
export function wordRecordFixture(
  studentId: string,
  wordId: string,
  patch: Partial<StudentMasteryRecord> = {},
): StudentMasteryRecord {
  const record = {
    studentId,
    targetKey: learningTargetKey({ type: "word", key: wordId }),
    targetType: "word" as const,
    state: "practicing" as const,
    masteryScore: 0.4,
    confidence: 0.5,
    exposureCount: 3,
    retrievalSuccessCount: 2,
    retrievalFailureCount: 1,
    firstTrySuccessCount: 1,
    lastSeenAt: "2026-07-09T08:00:00.000Z",
    lastSuccessAt: "2026-07-09T08:00:00.000Z",
    nextReviewAt: null,
    commonErrorCodes: [],
    scaffoldingNeeded: "medium" as const,
    updatedAt: "2026-07-09T08:00:00.000Z",
  };
  return { ...record, ...patch };
}
