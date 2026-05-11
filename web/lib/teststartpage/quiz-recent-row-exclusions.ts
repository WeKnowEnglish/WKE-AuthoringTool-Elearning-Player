/**
 * Remembers last few quiz row picks per topic + length + difficulty so consecutive
 * games prefer fresh sentences/targets (client localStorage only).
 */

import type { QuizBuildOptions, QuizTopicId } from "@/lib/curated-sentences/quiz-compiler-types";

const STORAGE_KEY = "wke-quiz-recent-row-ids-v1";
const MAX_RECENT_RUNS = 3;

type StoreShape = Record<string, string[][]>;

function makeKey(topicId: QuizTopicId, opts: Pick<QuizBuildOptions, "questionCount" | "difficultyLevel">): string {
  return `${topicId}:${opts.questionCount}:${opts.difficultyLevel}`;
}

function readStore(): StoreShape {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as StoreShape;
    return typeof p === "object" && p !== null && !Array.isArray(p) ? p : {};
  } catch {
    return {};
  }
}

function writeStore(data: StoreShape) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

/** All row identities from the last {@link MAX_RECENT_RUNS} completed quizzes for this key. */
export function getExcludedRowIdentitiesForQuiz(topicId: QuizTopicId, opts: QuizBuildOptions): string[] {
  const store = readStore();
  const key = makeKey(topicId, opts);
  const runs = store[key] ?? [];
  const set = new Set<string>();
  for (const run of runs) {
    for (const id of run) {
      if (typeof id === "string" && id.length > 0) set.add(id);
    }
  }
  return [...set];
}

/** Call after a quiz is built successfully so the next runs can avoid these rows. */
export function recordQuizRowIdentities(
  topicId: QuizTopicId,
  opts: QuizBuildOptions,
  identities: string[],
): void {
  const clean = identities.filter((s) => typeof s === "string" && s.length > 0);
  if (clean.length === 0) return;
  const store = readStore();
  const key = makeKey(topicId, opts);
  const prev = store[key] ?? [];
  store[key] = [clean, ...prev].slice(0, MAX_RECENT_RUNS);
  writeStore(store);
}
