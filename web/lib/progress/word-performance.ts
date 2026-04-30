"use client";

export const WORD_PERFORMANCE_STORAGE_KEY = "wke-word-performance-v1";

export type WordPerformanceRow = {
  word: string;
  attempts: number;
  successes: number;
  failures: number;
  lastSeenAt: string;
  lastSuccessAt: string | null;
};

export type WordPerformanceMap = Record<string, WordPerformanceRow>;

function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

export function getWordPerformanceSnapshot(): WordPerformanceMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WORD_PERFORMANCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WordPerformanceMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeWordPerformanceSnapshot(snapshot: WordPerformanceMap) {
  localStorage.setItem(WORD_PERFORMANCE_STORAGE_KEY, JSON.stringify(snapshot));
}

export function recordWordInteraction(words: string[], success: boolean) {
  if (!words.length) return;
  const snapshot = getWordPerformanceSnapshot();
  const now = new Date().toISOString();
  for (const rawWord of words) {
    const word = normalizeWord(rawWord);
    if (!word) continue;
    const existing = snapshot[word] ?? {
      word,
      attempts: 0,
      successes: 0,
      failures: 0,
      lastSeenAt: now,
      lastSuccessAt: null,
    };
    existing.attempts += 1;
    if (success) {
      existing.successes += 1;
      existing.lastSuccessAt = now;
    } else {
      existing.failures += 1;
    }
    existing.lastSeenAt = now;
    snapshot[word] = existing;
  }
  writeWordPerformanceSnapshot(snapshot);
}
