import { z } from "zod";
import type { LearningStrandAssessment } from "@/lib/learning-strands";
import { parseWordIdFromTargetKey } from "@/lib/mastery/teacher-mastery-summary";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import type {
  GrammarTableRow,
  VocabularyTableRow,
} from "@/lib/mastery/teacher-mastery-display";

export const parentProgressStatusSchema = z.enum([
  "collecting_evidence",
  "getting_started",
  "developing",
  "secure",
  "strong",
]);

export type ParentProgressStatus = z.infer<typeof parentProgressStatusSchema>;

const shortText = z.string().trim().min(1).max(240);
const narrativeText = z.string().trim().min(1).max(2000);

export const parentProgressSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  studentName: shortText,
  classTitle: shortText,
  periodLabel: shortText,
  currentTopic: narrativeText,
  recentLearning: narrativeText,
  doingWell: z.object({ title: shortText, detail: narrativeText }),
  nextFocus: z.object({ title: shortText, detail: narrativeText }),
  skills: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        label: shortText,
        status: parentProgressStatusSchema,
        description: narrativeText,
        evidenceLabel: shortText,
      }),
    )
    .max(6),
  evidence: z
    .array(
      z.object({
        title: shortText,
        detail: narrativeText,
        observedAt: z.string().datetime().nullable(),
      }),
    )
    .max(5),
  teacherSummary: narrativeText,
  homeSupport: z.object({
    title: shortText,
    instruction: narrativeText,
    minutes: z.number().int().min(1).max(30),
  }),
  evidenceScope: z.object({ label: shortText, caveat: narrativeText }),
});

export type ParentProgressSnapshot = z.infer<typeof parentProgressSnapshotSchema>;

export type ParentProgressReportStatus =
  | "draft"
  | "ready_for_review"
  | "published"
  | "archived";

export type ParentProgressReport = {
  id: string;
  studentId: string;
  classId: string;
  version: number;
  status: ParentProgressReportStatus;
  periodStart: string;
  periodEnd: string;
  snapshot: ParentProgressSnapshot;
  generatedAt: string;
  reviewedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
};

export const PARENT_PROGRESS_STATUS_COPY: Record<
  ParentProgressStatus,
  { label: string; explanation: string }
> = {
  collecting_evidence: {
    label: "Collecting evidence",
    explanation: "There is not enough recent, consistent evidence to make a firm claim yet.",
  },
  getting_started: {
    label: "Getting started",
    explanation: "This skill is at an early stage and currently benefits from clear support.",
  },
  developing: {
    label: "Developing",
    explanation: "Progress is visible, but success is not yet stable or independent.",
  },
  secure: {
    label: "Secure",
    explanation: "Repeated success is visible with moderate or low support.",
  },
  strong: {
    label: "Strong",
    explanation: "Consistent, confident success is visible with low support.",
  },
};

function ageInDays(value: string | null, now: Date): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, (now.getTime() - timestamp) / (24 * 60 * 60 * 1000));
}

export function parentStatusForEvidence(input: {
  masteryScore: number;
  confidence: number;
  evidenceCount: number;
  successCount: number;
  firstTrySuccessCount: number;
  scaffoldingNeeded: "high" | "medium" | "low";
  lastSeenAt: string | null;
  now?: Date;
}): ParentProgressStatus {
  const now = input.now ?? new Date();
  const ageDays = ageInDays(input.lastSeenAt, now);
  const firstTryRate =
    input.successCount > 0 ? input.firstTrySuccessCount / input.successCount : 0;

  if (
    input.evidenceCount < 3 ||
    input.confidence < 0.18 ||
    ageDays === null ||
    ageDays > 75
  ) {
    return "collecting_evidence";
  }
  if (
    input.masteryScore >= 0.85 &&
    input.confidence >= 0.65 &&
    input.evidenceCount >= 6 &&
    firstTryRate >= 0.7 &&
    input.scaffoldingNeeded === "low" &&
    ageDays <= 30
  ) {
    return "strong";
  }
  if (
    input.masteryScore >= 0.65 &&
    input.confidence >= 0.4 &&
    input.evidenceCount >= 4 &&
    input.scaffoldingNeeded !== "high" &&
    ageDays <= 45
  ) {
    return "secure";
  }
  if (input.masteryScore >= 0.35 || input.successCount >= 2) return "developing";
  return "getting_started";
}

function strandDescription(
  strand: LearningStrandAssessment,
  status: ParentProgressStatus,
): string {
  const purposeById: Record<string, string> = {
    meaning_focused_input: "understanding messages through listening and reading",
    meaning_focused_output: "using English to communicate through speaking and writing",
    language_focused_learning: "building vocabulary, grammar, spelling, and language accuracy",
    fluency_development: "using familiar English more smoothly and automatically",
  };
  const purpose = purposeById[strand.strandId] ?? "using this English skill";
  if (status === "collecting_evidence") {
    return `We are still collecting enough varied practice to describe ${purpose} reliably.`;
  }
  return `${PARENT_PROGRESS_STATUS_COPY[status].explanation} The current evidence relates to ${purpose}.`;
}

function formatPeriod(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function targetLabel(
  record: StudentMasteryRecord,
  vocabularyRows: VocabularyTableRow[],
  grammarRows: GrammarTableRow[],
): string {
  const wordId = parseWordIdFromTargetKey(record.targetKey);
  if (wordId) {
    return vocabularyRows.find((row) => row.wordItemId === wordId)?.lemma ?? "a vocabulary item";
  }
  if (record.targetType === "grammar") {
    return grammarRows.find((row) => row.targetKey === record.targetKey)?.label ??
      record.targetLabel ??
      "a grammar pattern";
  }
  return record.targetLabel ?? record.targetKey.replace(/^[^:]+:/, "").replaceAll("_", " ");
}

function statusForRecord(record: StudentMasteryRecord, now: Date): ParentProgressStatus {
  return parentStatusForEvidence({
    masteryScore: record.masteryScore,
    confidence: record.confidence,
    evidenceCount: record.exposureCount,
    successCount: record.retrievalSuccessCount,
    firstTrySuccessCount: record.firstTrySuccessCount,
    scaffoldingNeeded: record.scaffoldingNeeded,
    lastSeenAt: record.lastSeenAt,
    now,
  });
}

export function buildParentProgressDraft(input: {
  studentName: string;
  classTitle: string;
  records: StudentMasteryRecord[];
  strands: LearningStrandAssessment[];
  vocabularyRows: VocabularyTableRow[];
  grammarRows: GrammarTableRow[];
  now?: Date;
}): { periodStart: string; periodEnd: string; snapshot: ParentProgressSnapshot } {
  const now = input.now ?? new Date();
  const periodStartDate = new Date(now);
  periodStartDate.setUTCDate(periodStartDate.getUTCDate() - 29);

  const parentSkillLabels: Record<string, string> = {
    meaning_focused_input: "Understanding English",
    meaning_focused_output: "Communicating in English",
    language_focused_learning: "Vocabulary and language accuracy",
    fluency_development: "Fluency with familiar English",
  };
  const skills = input.strands.map((strand) => {
    const status = parentStatusForEvidence({
      masteryScore: strand.masteryScore,
      confidence: strand.confidence,
      evidenceCount: strand.evidenceCount,
      successCount: strand.successCount,
      firstTrySuccessCount: strand.firstTrySuccessCount,
      scaffoldingNeeded: strand.scaffoldingNeeded,
      lastSeenAt: strand.lastSeenAt,
      now,
    });
    return {
      id: strand.strandId,
      label: parentSkillLabels[strand.strandId] ?? strand.strandLabel,
      status,
      description: strandDescription(strand, status),
      evidenceLabel:
        strand.evidenceCount === 0
          ? "No saved practice evidence yet"
          : `Based on ${strand.evidenceCount} saved practice moment${strand.evidenceCount === 1 ? "" : "s"}`,
    };
  });

  const statusRank: Record<ParentProgressStatus, number> = {
    collecting_evidence: 0,
    getting_started: 1,
    developing: 2,
    secure: 3,
    strong: 4,
  };
  const assessed = skills.filter((skill) => skill.status !== "collecting_evidence");
  const strongest = [...assessed].sort(
    (a, b) => statusRank[b.status] - statusRank[a.status],
  )[0];
  const next = [...assessed].sort((a, b) => statusRank[a.status] - statusRank[b.status])[0];

  const recentTargetRecords = [...input.records]
    .filter((record) => record.exposureCount > 0 && record.lastSeenAt)
    .sort((a, b) => String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
  const practicedVocabulary = Array.from(
    new Set(
      recentTargetRecords
        .filter((record) => record.targetType === "word")
        .map((record) => targetLabel(record, input.vocabularyRows, input.grammarRows)),
    ),
  ).slice(0, 4);
  const practicedGrammar = Array.from(
    new Set(
      recentTargetRecords
        .filter((record) => record.targetType === "grammar")
        .map((record) => targetLabel(record, input.vocabularyRows, input.grammarRows)),
    ),
  ).slice(0, 2);
  const topicParts = [
    practicedVocabulary.length > 0 ? `Vocabulary: ${practicedVocabulary.join(", ")}` : "",
    practicedGrammar.length > 0 ? `Grammar: ${practicedGrammar.join(", ")}` : "",
  ].filter(Boolean);

  const recentRecords = recentTargetRecords.slice(0, 3);
  const evidence = recentRecords.map((record) => {
    const status = statusForRecord(record, now);
    return {
      title: `Practised ${targetLabel(record, input.vocabularyRows, input.grammarRows)}`,
      detail: PARENT_PROGRESS_STATUS_COPY[status].explanation,
      observedAt: record.lastSeenAt,
    };
  });

  const wordCount = input.records.filter((record) => record.targetType === "word").length;
  const nonWordCount = input.records.filter((record) => record.targetType !== "word").length;
  const vocabularyHeavy =
    wordCount > 0 && (nonWordCount === 0 || wordCount >= nonWordCount * 2);
  const weakWords = [...input.vocabularyRows]
    .filter((row) => row.exposureCount > 0)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 3)
    .map((row) => row.lemma);

  const snapshot: ParentProgressSnapshot = {
    schemaVersion: 1,
    studentName: input.studentName,
    classTitle: input.classTitle,
    periodLabel: formatPeriod(periodStartDate, now),
    currentTopic: topicParts.join(". ") || "Foundational English practice",
    recentLearning:
      input.records.length > 0
        ? `${input.studentName} has been practising recently taught language through saved learning activities.`
        : `We are waiting for enough saved learning activity to describe ${input.studentName}'s recent practice reliably.`,
    doingWell: strongest
      ? {
          title: strongest.label,
          detail: `${input.studentName} is showing ${PARENT_PROGRESS_STATUS_COPY[strongest.status].label.toLowerCase()} progress in this area.`,
        }
      : {
          title: "Building a clearer learning picture",
          detail: "The next activities will help the teacher identify a reliable strength to celebrate.",
        },
    nextFocus: next
      ? {
          title: next.label,
          detail: `Continued short, supported practice will help make success in this area more stable.`,
        }
      : {
          title: "Collect varied practice evidence",
          detail: "The immediate focus is completing a few more activities across different English skills.",
        },
    skills,
    evidence,
    teacherSummary:
      assessed.length > 0
        ? `${input.studentName} is making progress in the areas shown below. These descriptions are limited to saved, recent practice and should be read alongside classroom observation.`
        : `We are still collecting enough recent and varied evidence to make reliable learning claims.`,
    homeSupport: {
      title: weakWords.length > 0 ? "Quick recall practice" : "Talk about today's English",
      instruction:
        weakWords.length > 0
          ? `Choose one or two words (${weakWords.join(", ")}) and ask ${input.studentName} to use each in a short sentence. Give a clue if needed and finish with encouragement.`
          : `Ask ${input.studentName} to teach you one English word or sentence from class. Listen first, then ask for one example.`,
      minutes: 5,
    },
    evidenceScope: {
      label: vocabularyHeavy ? "Mainly vocabulary evidence" : "Recent saved learning evidence",
      caveat: vocabularyHeavy
        ? "Most current evidence comes from vocabulary practice. This report does not represent overall English proficiency or every language skill."
        : "This report reflects recent server-saved activities only. It is not a formal grade or an overall proficiency level.",
    },
  };

  return {
    periodStart: isoDate(periodStartDate),
    periodEnd: isoDate(now),
    snapshot: parentProgressSnapshotSchema.parse(snapshot),
  };
}

export function parseParentProgressSnapshot(value: unknown): ParentProgressSnapshot | null {
  const result = parentProgressSnapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}
