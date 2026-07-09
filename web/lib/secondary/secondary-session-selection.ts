import { learningTargetKey } from "@/lib/mastery/engine";
import {
  classifyWordForPractice,
  type VocabularyRecommendationReason,
} from "@/lib/mastery/recommendations";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import {
  applyStretchWordToTodayList,
  enforceTopicSpreadOnTodayList,
} from "@/lib/secondary/secondary-selection-s2";

export const WARMUP_WORDS = 3;
export const TARGET_TODAY_WORDS = 10;
export const DUE_QUOTA = 4;
export const FRAGILE_QUOTA = 3;
export const NEW_QUOTA = 2;
export const REFRESH_QUOTA = 1;

/** Bump when selection rules change (S1=2 quotas only; S2=3 topic spread + stretch). */
export const SECONDARY_SELECTION_VERSION = 3 as const;

export type SecondaryWordBucket =
  | "due"
  | "fragile"
  | "new"
  | "refresh"
  | "mastered";

export type SecondarySelectionQuotas = {
  warmupWords: number;
  dueQuota: number;
  fragileQuota: number;
  newQuota: number;
  refreshQuota: number;
  targetTodayWords: number;
};

export const DEFAULT_SECONDARY_SELECTION_QUOTAS: SecondarySelectionQuotas = {
  warmupWords: WARMUP_WORDS,
  dueQuota: DUE_QUOTA,
  fragileQuota: FRAGILE_QUOTA,
  newQuota: NEW_QUOTA,
  refreshQuota: REFRESH_QUOTA,
  targetTodayWords: TARGET_TODAY_WORDS,
};

export type SecondaryWordCandidate = {
  wordItemId: string;
  bucket: SecondaryWordBucket;
  masteryScore: number;
  state: StudentMasteryRecord["state"];
  confidence: number;
  exposureCount: number;
  recentAccuracy: number;
  nextReviewAtMs: number;
};

export type SecondarySessionSelectionReason =
  | VocabularyRecommendationReason
  | "new"
  | "refresh"
  | "cloze_include"
  | "stretch";

export type SecondarySessionSelectionResult = {
  warmUpWordItemIds: string[];
  todayWordItemIds: string[];
  allWordItemIds: string[];
  reasons?: Record<string, SecondarySessionSelectionReason>;
};

function recentAccuracyForRecord(record: StudentMasteryRecord): number {
  const attempts = record.retrievalSuccessCount + record.retrievalFailureCount;
  return attempts > 0 ? record.retrievalSuccessCount / attempts : 0;
}

function nextReviewAtMs(record: StudentMasteryRecord | null, now: Date): number {
  if (!record?.nextReviewAt) return now.getTime() - 1;
  const ms = new Date(record.nextReviewAt).getTime();
  return Number.isNaN(ms) ? now.getTime() - 1 : ms;
}

function bucketFromClassification(
  classification: ReturnType<typeof classifyWordForPractice>,
): SecondaryWordBucket {
  switch (classification) {
    case "new":
      return "new";
    case "mastered":
      return "mastered";
    case "due_review":
      return "due";
    case "fragile":
    case "low_confidence":
      return "fragile";
    case "developing":
    case null:
      return "refresh";
  }
}

function reasonFromBucket(bucket: SecondaryWordBucket): SecondarySessionSelectionReason {
  switch (bucket) {
    case "due":
      return "due_review";
    case "fragile":
      return "fragile";
    case "new":
      return "new";
    case "refresh":
      return "refresh";
    case "mastered":
      return "due_review";
  }
}

function compareWeakest(a: SecondaryWordCandidate, b: SecondaryWordCandidate): number {
  if (a.masteryScore !== b.masteryScore) return a.masteryScore - b.masteryScore;
  if (a.recentAccuracy !== b.recentAccuracy) return a.recentAccuracy - b.recentAccuracy;
  if (a.exposureCount !== b.exposureCount) return a.exposureCount - b.exposureCount;
  return a.wordItemId.localeCompare(b.wordItemId);
}

export function buildCandidate(
  wordItemId: string,
  record: StudentMasteryRecord | null,
  now: Date,
): SecondaryWordCandidate {
  const classification = classifyWordForPractice({ wordId: wordItemId, record, now });
  let bucket = bucketFromClassification(classification);
  if (record && record.masteryScore >= 0.75) {
    bucket = "mastered";
  }

  return {
    wordItemId,
    bucket,
    masteryScore: record?.masteryScore ?? 0,
    state: record?.state ?? "new",
    confidence: record?.confidence ?? 0,
    exposureCount: record?.exposureCount ?? 0,
    recentAccuracy: record ? recentAccuracyForRecord(record) : 0,
    nextReviewAtMs: nextReviewAtMs(record, now),
  };
}

function sortWeakest(candidates: SecondaryWordCandidate[]): SecondaryWordCandidate[] {
  return [...candidates].sort(compareWeakest);
}

function pickQuota(
  pool: SecondaryWordCandidate[],
  quota: number,
  picked: Set<string>,
): string[] {
  const ids: string[] = [];
  for (const candidate of pool) {
    if (ids.length >= quota) break;
    if (picked.has(candidate.wordItemId)) continue;
    ids.push(candidate.wordItemId);
    picked.add(candidate.wordItemId);
  }
  return ids;
}

function pickWarmup(
  candidates: SecondaryWordCandidate[],
  warmupWords: number,
  picked: Set<string>,
): string[] {
  const pool = sortWeakest(
    candidates.filter(
      (c) => c.bucket === "due" || c.bucket === "fragile",
    ),
  ).sort((a, b) => {
    const aSeen = a.exposureCount > 0 ? 0 : 1;
    const bSeen = b.exposureCount > 0 ? 0 : 1;
    if (aSeen !== bSeen) return aSeen - bSeen;
    return compareWeakest(a, b);
  });

  return pickQuota(pool, warmupWords, picked);
}

function pickRefreshQuota(
  pool: SecondaryWordCandidate[],
  quota: number,
  picked: Set<string>,
  studentId: string,
  dateKey: string,
): string[] {
  if (quota <= 0 || pool.length === 0) return [];

  const shuffled = shuffleWithSeed(
    sortWeakest(pool),
    `${studentId}:${dateKey}:refresh`,
  );

  return pickQuota(shuffled, quota, picked);
}

function fillTodayWaterfall(
  pools: Record<SecondaryWordBucket, SecondaryWordCandidate[]>,
  targetTodayWords: number,
  todayWordItemIds: string[],
  picked: Set<string>,
): void {
  const fillOrder: Exclude<SecondaryWordBucket, "mastered">[] = [
    "due",
    "fragile",
    "new",
    "refresh",
  ];

  while (todayWordItemIds.length < targetTodayWords) {
    let added = false;
    for (const bucket of fillOrder) {
      const next = pools[bucket].find((c) => !picked.has(c.wordItemId));
      if (!next) continue;
      todayWordItemIds.push(next.wordItemId);
      picked.add(next.wordItemId);
      added = true;
      break;
    }
    if (!added) break;
  }

  // Safety valve: if nothing could be selected from active buckets,
  // allow review from mastered words instead of returning an empty day.
  if (todayWordItemIds.length === 0) {
    for (const candidate of pools.mastered) {
      if (todayWordItemIds.length >= targetTodayWords) break;
      if (picked.has(candidate.wordItemId)) continue;
      todayWordItemIds.push(candidate.wordItemId);
      picked.add(candidate.wordItemId);
    }
  }
}

export function selectSecondaryTodayWords(input: {
  candidateWordItemIds: string[];
  studentId: string;
  dateKey: string;
  now: Date;
  clozeBlankIds: string[];
  masteryRecords: Record<string, StudentMasteryRecord>;
  quotas?: Partial<SecondarySelectionQuotas>;
}): SecondarySessionSelectionResult {
  const quotas: SecondarySelectionQuotas = {
    ...DEFAULT_SECONDARY_SELECTION_QUOTAS,
    ...input.quotas,
  };

  if (input.candidateWordItemIds.length === 0) {
    return {
      warmUpWordItemIds: [],
      todayWordItemIds: [],
      allWordItemIds: [],
    };
  }

  const candidates = input.candidateWordItemIds.map((wordItemId) => {
    const targetKey = learningTargetKey({ type: "word", key: wordItemId });
    const record = input.masteryRecords[targetKey] ?? null;
    return buildCandidate(wordItemId, record, input.now);
  });

  const selectable = candidates.filter((c) => c.bucket !== "mastered");
  const pools: Record<SecondaryWordBucket, SecondaryWordCandidate[]> = {
    due: sortWeakest(selectable.filter((c) => c.bucket === "due")),
    fragile: sortWeakest(selectable.filter((c) => c.bucket === "fragile")),
    new: sortWeakest(selectable.filter((c) => c.bucket === "new")),
    refresh: sortWeakest(selectable.filter((c) => c.bucket === "refresh")),
    mastered: sortWeakest(candidates.filter((c) => c.bucket === "mastered")),
  };

  const picked = new Set<string>();
  const reasons: Record<string, SecondarySessionSelectionReason> = {};

  const warmUpWordItemIds = pickWarmup(candidates, quotas.warmupWords, picked);
  for (const id of warmUpWordItemIds) {
    const bucket = candidates.find((c) => c.wordItemId === id)?.bucket;
    if (bucket && bucket !== "mastered") reasons[id] = reasonFromBucket(bucket);
  }

  const todayWordItemIds: string[] = [];

  const duePicks = pickQuota(pools.due, quotas.dueQuota, picked);
  todayWordItemIds.push(...duePicks);
  duePicks.forEach((id) => {
    reasons[id] = "due_review";
  });

  const fragilePicks = pickQuota(pools.fragile, quotas.fragileQuota, picked);
  todayWordItemIds.push(...fragilePicks);
  fragilePicks.forEach((id) => {
    reasons[id] = "fragile";
  });

  const newPicks = pickQuota(pools.new, quotas.newQuota, picked);
  todayWordItemIds.push(...newPicks);
  newPicks.forEach((id) => {
    reasons[id] = "new";
  });

  const refreshPicks = pickRefreshQuota(
    pools.refresh,
    quotas.refreshQuota,
    picked,
    input.studentId,
    input.dateKey,
  );
  todayWordItemIds.push(...refreshPicks);
  refreshPicks.forEach((id) => {
    reasons[id] = "refresh";
  });

  fillTodayWaterfall(pools, quotas.targetTodayWords, todayWordItemIds, picked);
  for (const id of todayWordItemIds) {
    if (!reasons[id]) {
      const bucket = candidates.find((c) => c.wordItemId === id)?.bucket;
      if (bucket && bucket !== "mastered") reasons[id] = reasonFromBucket(bucket);
    }
  }

  enforceTopicSpreadOnTodayList({
    todayWordItemIds,
    replacementPoolWordItemIds: selectable.map((candidate) => candidate.wordItemId),
    picked,
    reasons,
  });

  applyStretchWordToTodayList({
    todayWordItemIds,
    stretchCandidateWordItemIds: selectable.map((candidate) => candidate.wordItemId),
    picked,
    reasons,
  });

  const todaySet = new Set(todayWordItemIds);
  const warmUpSet = new Set(warmUpWordItemIds);
  const candidateById = new Map(candidates.map((c) => [c.wordItemId, c]));

  for (const blankId of input.clozeBlankIds) {
    if (!input.candidateWordItemIds.includes(blankId)) continue;
    if (warmUpSet.has(blankId)) continue;

    if (!todaySet.has(blankId)) {
      todayWordItemIds.push(blankId);
      todaySet.add(blankId);
    }
    reasons[blankId] = "cloze_include";
  }

  const allWordItemIds = Array.from(
    new Set([...warmUpWordItemIds, ...todayWordItemIds]),
  );

  return {
    warmUpWordItemIds,
    todayWordItemIds,
    allWordItemIds,
    reasons,
  };
}
