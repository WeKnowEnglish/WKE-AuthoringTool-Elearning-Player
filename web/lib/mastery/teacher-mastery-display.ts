import {
  assessLearningStrands,
  type LearningStrandAssessment,
} from "@/lib/learning-strands";
import {
  classifyWordForPractice,
  vocabularyRecommendationReasonLabel,
} from "@/lib/mastery/recommendations";
import {
  buildTeacherStudentMasteryDiagnostic,
  parseWordIdFromTargetKey,
  pickDueReviewTargets,
  pickFragileTargets,
  pickWeakWordTargets,
  type TeacherStudentMasteryDiagnostic,
} from "@/lib/mastery/teacher-mastery-summary";
import type { MasteryState, StudentMasteryRecord } from "@/lib/mastery/types";
import {
  getSecondaryVocabItemsByIds,
  type SecondaryVocabItem,
} from "@/lib/secondary/secondary-vocab-bank";

export type TeacherWordLabel = {
  lemma: string;
  topicTitle?: string;
};

export type VocabularyTableRow = {
  wordItemId: string;
  lemma: string;
  masteryScore: number;
  state: MasteryState;
  signal: string | null;
  exposureCount: number;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
};

export type GrammarTableRow = {
  targetKey: string;
  label: string;
  masteryScore: number;
  state: MasteryState;
  exposureCount: number;
  lastSeenAt: string | null;
};

export type TeacherProgressNarrative = {
  summary: string;
  actions: string[];
};

const STATE_ORDER: MasteryState[] = [
  "new",
  "introduced",
  "practicing",
  "developing",
  "secure",
  "needs_review",
  "stuck",
];

export function masteryScoreTone(score: number): "low" | "mid" | "good" | "strong" {
  if (score < 0.35) return "low";
  if (score < 0.65) return "mid";
  if (score < 0.85) return "good";
  return "strong";
}

export function masteryScoreBarClass(tone: ReturnType<typeof masteryScoreTone>): string {
  switch (tone) {
    case "low":
      return "bg-rose-500";
    case "mid":
      return "bg-amber-500";
    case "good":
      return "bg-emerald-500";
    case "strong":
      return "bg-teal-600";
  }
}

export function rubricBadgeClass(levelId: string): string {
  switch (levelId) {
    case "not_enough_evidence":
      return "bg-neutral-100 text-neutral-700";
    case "emerging":
      return "bg-rose-100 text-rose-900";
    case "developing":
      return "bg-amber-100 text-amber-900";
    case "secure":
      return "bg-emerald-100 text-emerald-900";
    case "extending":
      return "bg-teal-100 text-teal-900";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export function formatMasteryStateLabel(state: MasteryState): string {
  switch (state) {
    case "new":
      return "New";
    case "introduced":
      return "Introduced";
    case "practicing":
      return "Practicing";
    case "developing":
      return "Developing";
    case "secure":
      return "Secure";
    case "needs_review":
      return "Needs review";
    case "stuck":
      return "Stuck";
  }
}

export function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 14) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : iso;
}

export function recordsToMap(
  records: StudentMasteryRecord[],
): Record<string, StudentMasteryRecord> {
  const map: Record<string, StudentMasteryRecord> = {};
  for (const record of records) {
    map[record.targetKey] = record;
  }
  return map;
}

export function buildTeacherStrandAssessments(
  records: StudentMasteryRecord[],
): LearningStrandAssessment[] {
  return assessLearningStrands({ records: recordsToMap(records) });
}

export function resolveTeacherWordLabels(
  wordIds: string[],
): Map<string, TeacherWordLabel> {
  const items = getSecondaryVocabItemsByIds(wordIds);
  const byId = new Map<string, SecondaryVocabItem>(
    items.map((item) => [item.wordItemId, item]),
  );
  const labels = new Map<string, TeacherWordLabel>();
  for (const wordId of wordIds) {
    const item = byId.get(wordId);
    labels.set(wordId, {
      lemma: item?.lemma ?? item?.word ?? wordId,
      topicTitle: item?.topicId,
    });
  }
  return labels;
}

function wordSignal(record: StudentMasteryRecord, now: Date): string | null {
  const wordId = parseWordIdFromTargetKey(record.targetKey);
  if (!wordId) return null;
  const reason = classifyWordForPractice({ wordId, record, now });
  if (!reason || reason === "new" || reason === "mastered") return null;
  if (reason === "developing") return "developing";
  return vocabularyRecommendationReasonLabel(reason);
}

export function buildVocabularyTableRows(
  records: StudentMasteryRecord[],
  now = new Date(),
): VocabularyTableRow[] {
  const wordRecords = records.filter(
    (record) => record.targetType === "word" && record.exposureCount > 0,
  );
  const wordIds = wordRecords
    .map((record) => parseWordIdFromTargetKey(record.targetKey))
    .filter((id): id is string => !!id);
  const labels = resolveTeacherWordLabels(wordIds);

  return wordRecords
    .map((record) => {
      const wordItemId = parseWordIdFromTargetKey(record.targetKey) ?? record.targetKey;
      const label = labels.get(wordItemId);
      return {
        wordItemId,
        lemma: label?.lemma ?? wordItemId,
        masteryScore: record.masteryScore,
        state: record.state,
        signal: wordSignal(record, now),
        exposureCount: record.exposureCount,
        lastSeenAt: record.lastSeenAt,
        nextReviewAt: record.nextReviewAt,
      };
    })
    .sort((a, b) => a.masteryScore - b.masteryScore || a.lemma.localeCompare(b.lemma));
}

export function buildGrammarTableRows(records: StudentMasteryRecord[]): GrammarTableRow[] {
  return records
    .filter((record) => record.targetType === "grammar" && record.exposureCount > 0)
    .map((record) => ({
      targetKey: record.targetKey,
      label: record.targetLabel ?? record.targetKey.replace(/^grammar:/, ""),
      masteryScore: record.masteryScore,
      state: record.state,
      exposureCount: record.exposureCount,
      lastSeenAt: record.lastSeenAt,
    }))
    .sort((a, b) => a.masteryScore - b.masteryScore || a.label.localeCompare(b.label));
}

export function buildTeacherProgressNarrative(input: {
  diagnostic: TeacherStudentMasteryDiagnostic;
  strands: LearningStrandAssessment[];
  studentDisplayName: string;
}): TeacherProgressNarrative {
  const { diagnostic, strands, studentDisplayName } = input;
  const actions: string[] = [];

  if (diagnostic.recordCount === 0) {
    return {
      summary: `${studentDisplayName} has no mastery evidence on the server yet. The student may still be practicing as a guest, or has not synced while signed in.`,
      actions: [
        "Ask the student to sign in before practice so progress saves to their account.",
        "After practice, refresh this page to see updated mastery.",
      ],
    };
  }

  const dueCount = diagnostic.dueReview.length;
  const weakCount = diagnostic.weakWords.length;
  const fragileCount = diagnostic.fragile.length;
  const grammarCount = diagnostic.grammarWeak.length;

  const assessedStrands = strands.filter((strand) => strand.level.id !== "not_enough_evidence");
  const weakest =
    assessedStrands.length > 0 ?
      [...assessedStrands].sort((a, b) => a.masteryScore - b.masteryScore)[0]
    : [...strands].sort((a, b) => a.masteryScore - b.masteryScore)[0];

  const summaryParts = [
    `${studentDisplayName} has ${diagnostic.recordCount} tracked learning targets on the server.`,
  ];

  if (weakCount > 0) {
    summaryParts.push(
      `Vocabulary needs attention on ${weakCount} word${weakCount === 1 ? "" : "s"} with the lowest mastery scores.`,
    );
  } else {
    summaryParts.push("Vocabulary scores look relatively strong in the tracked word set.");
  }

  if (dueCount > 0) {
    summaryParts.push(`${dueCount} word${dueCount === 1 ? " is" : "s are"} due for spaced review.`);
  }

  if (weakest) {
    summaryParts.push(
      `${weakest.strandLabel} is ${weakest.level.label.toLowerCase()} (${Math.round(weakest.masteryScore * 100)}% strand score).`,
    );
  }

  if (dueCount > 0) {
    actions.push("Schedule a short review block for due vocabulary.");
  }
  if (fragileCount > 0) {
    actions.push(`Reteach or scaffold ${fragileCount} fragile vocabulary item${fragileCount === 1 ? "" : "s"}.`);
  }
  if (grammarCount > 0) {
    actions.push("Revisit grammar poster practice for weak concepts.");
  }
  if (weakest && weakest.level.id !== "secure" && weakest.level.id !== "extending") {
    actions.push(weakest.level.nextMove);
  }
  if (actions.length === 0) {
    actions.push("Maintain spaced review and offer slightly harder transfer tasks.");
  }

  return {
    summary: summaryParts.join(" "),
    actions: actions.slice(0, 5),
  };
}

export function teacherAttentionScore(input: {
  dueReviewCount: number;
  weakWordCount: number;
  latestUpdatedAt: string | null;
}): number {
  let score = input.dueReviewCount * 3 + input.weakWordCount;
  if (input.latestUpdatedAt) {
    const ageMs = Date.now() - Date.parse(input.latestUpdatedAt);
    if (Number.isFinite(ageMs) && ageMs > 7 * 24 * 60 * 60 * 1000) {
      score += 1;
    }
  }
  return score;
}

export function buildFullStudentDiagnostic(studentId: string, records: StudentMasteryRecord[]) {
  const diagnostic = buildTeacherStudentMasteryDiagnostic(studentId, records, {
    weakWordLimit: 999,
    dueReviewLimit: 999,
    fragileLimit: 999,
    grammarWeakLimit: 999,
  });
  const strands = buildTeacherStrandAssessments(records);
  const vocabularyRows = buildVocabularyTableRows(records);
  const grammarRows = buildGrammarTableRows(records);
  return { diagnostic, strands, vocabularyRows, grammarRows };
}

export function stateDistributionEntries(
  countsByState: Partial<Record<MasteryState, number>>,
): Array<{ state: MasteryState; count: number; label: string }> {
  return STATE_ORDER.map((state) => ({
    state,
    count: countsByState[state] ?? 0,
    label: formatMasteryStateLabel(state),
  })).filter((entry) => entry.count > 0);
}

export type VocabularyFilter = "all" | "weak" | "due" | "fragile" | "mastered";

export function filterVocabularyRows(
  rows: VocabularyTableRow[],
  filter: VocabularyFilter,
  records: StudentMasteryRecord[],
  now = new Date(),
): VocabularyTableRow[] {
  if (filter === "all") return rows;

  const recordByWordId = new Map<string, StudentMasteryRecord>();
  for (const record of records) {
    const wordId = parseWordIdFromTargetKey(record.targetKey);
    if (wordId) recordByWordId.set(wordId, record);
  }

  if (filter === "weak") {
    const weakIds = new Set(
      pickWeakWordTargets(records, 25).map((row) => parseWordIdFromTargetKey(row.targetKey)),
    );
    return rows.filter((row) => weakIds.has(row.wordItemId));
  }

  if (filter === "due") {
    const dueIds = new Set(
      pickDueReviewTargets(records, now, 999).map((row) => parseWordIdFromTargetKey(row.targetKey)),
    );
    return rows.filter((row) => dueIds.has(row.wordItemId));
  }

  if (filter === "fragile") {
    const fragileIds = new Set(
      pickFragileTargets(records, now, 999).map((row) => parseWordIdFromTargetKey(row.targetKey)),
    );
    return rows.filter((row) => fragileIds.has(row.wordItemId));
  }

  return rows.filter((row) => {
    const record = recordByWordId.get(row.wordItemId);
    if (!record) return false;
    const reason = classifyWordForPractice({ wordId: row.wordItemId, record, now });
    return reason === "mastered" || row.masteryScore >= 0.75;
  });
}

export function studentNeedsAttention(input: {
  dueReviewCount: number;
  strands: LearningStrandAssessment[];
}): boolean {
  if (input.dueReviewCount > 0) return true;
  return input.strands.some(
    (strand) => strand.level.id === "emerging" && strand.evidenceCount >= 3,
  );
}
