"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import {
  clearSecondaryTodayActivityCompletion,
  setSecondaryTodayActivityCompletion,
} from "@/lib/secondary/secondary-today-session";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import {
  areSecondaryActivityWordsComplete,
  clearSecondaryLocalActivitySession,
  getSecondaryWordsNeedingRepair,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

function scoreToPercent(correctCount: number, totalCount: number): number {
  if (!totalCount) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

export function SpellingActivity() {
  const { todaySession } = useSecondaryTodaySession();
  const [queue, setQueue] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [attemptLog, setAttemptLog] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const spellingWordIds = useMemo(() => {
    if (!todaySession) return [];
    return filterWordItemIdsForSecondaryActivity(todaySession.allWordItemIds, "spelling");
  }, [todaySession]);

  const todayPrompts: SecondaryVocabItem[] = useMemo(() => {
    if (!spellingWordIds.length) return [];
    return getSecondaryVocabItemsByIds(spellingWordIds);
  }, [spellingWordIds]);

  const requiredWordIds = useMemo(
    () => todayPrompts.map((item) => item.wordItemId),
    [todayPrompts],
  );

  const promptById = useMemo(() => {
    const map = new Map<string, SecondaryVocabItem>();
    for (const item of todayPrompts) map.set(item.wordItemId, item);
    return map;
  }, [todayPrompts]);

  const currentWordItemId = queue[0] ?? null;
  const currentItem = currentWordItemId ? promptById.get(currentWordItemId) : undefined;
  const totalCount = requiredWordIds.length;
  const scorePercent = useMemo(
    () => scoreToPercent(attemptLog.filter(Boolean).length, Math.max(attemptLog.length, totalCount)),
    [attemptLog, totalCount],
  );

  useEffect(() => {
    if (!todaySession) return;
    setQueue([...requiredWordIds]);
    setValue("");
    setAttemptLog([]);
    setFeedback(null);
    setIsComplete(false);
  }, [todaySession, requiredWordIds]);

  if (!todaySession) {
    return (
      <section className="space-y-3 rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-sm font-semibold text-kid-ink/80">Loading today&apos;s practice...</p>
      </section>
    );
  }

  if (requiredWordIds.length === 0) {
    return (
      <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
          Lower Secondary Activity
        </p>
        <h2 className="text-2xl font-extrabold text-kid-ink">Spelling Activity</h2>
        <p className="text-sm font-semibold text-kid-ink/80">
          No spelling prompts are available in today&apos;s set.
        </p>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-extrabold text-kid-ink"
            href="/secondary"
          >
            Back to vocabulary home
          </Link>
        </div>
      </section>
    );
  }

  function completeIfReady(now: Date, log: boolean[]) {
    if (!areSecondaryActivityWordsComplete("spelling", requiredWordIds, now)) {
      const stillBroken = getSecondaryWordsNeedingRepair("spelling", requiredWordIds, now);
      setQueue(stillBroken);
      setIsComplete(false);
      return;
    }

    const percent = scoreToPercent(
      log.filter(Boolean).length,
      Math.max(log.length, requiredWordIds.length),
    );
    setSecondaryTodayActivityCompletion(
      "spelling",
      { completed: true, percent, completedAt: now.toISOString() },
      now,
    );
    setQueue([]);
    setIsComplete(true);
  }

  function handleSubmitAnswer() {
    if (isComplete || !currentItem || feedback !== null) return;

    const isCorrect = normalizeAnswer(currentItem.word) === normalizeAnswer(value);
    const now = new Date();

    recordSecondaryWordAttempt({
      activityType: "spelling",
      wordItemId: currentItem.wordItemId,
      isCorrect,
      attemptedAt: now.toISOString(),
    });

    setAttemptLog((current) => [...current, isCorrect]);
    setFeedback(isCorrect ? "correct" : "incorrect");
  }

  function handleNext() {
    if (feedback === null || !currentWordItemId) return;
    const now = new Date();
    const stillNeedsWork = getSecondaryWordsNeedingRepair(
      "spelling",
      requiredWordIds,
      now,
    ).includes(currentWordItemId);

    setValue("");
    setFeedback(null);

    const rest = queue.slice(1);
    const nextQueue = stillNeedsWork ? [...rest, currentWordItemId] : rest;

    if (nextQueue.length === 0) {
      completeIfReady(now, attemptLog);
      return;
    }

    setQueue(nextQueue);
  }

  function handleRetry() {
    const now = new Date();
    clearSecondaryLocalActivitySession("spelling", now);
    clearSecondaryTodayActivityCompletion("spelling", now);
    setQueue([...requiredWordIds]);
    setValue("");
    setAttemptLog([]);
    setFeedback(null);
    setIsComplete(false);
  }

  const queuePosition =
    totalCount > 0 ? totalCount - queue.length + 1 : 0;

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Spelling Activity</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        Type the correct vocabulary word for each prompt. Missed words come back for repair.
      </p>

      {isComplete ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h3 className="text-sm font-extrabold text-green-900">Completed</h3>
          <p className="mt-1 text-sm font-bold text-green-900">
            Final score: {attemptLog.filter(Boolean).length}/{attemptLog.length} ({scorePercent}%)
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-kid-ink/20 bg-kid-panel p-4">
          <p className="text-xs font-extrabold text-kid-ink/70">
            Item {Math.min(queuePosition, totalCount)} of {totalCount}
            {queue.length > totalCount ? " (repair)" : ""}
          </p>
          <p className="text-sm font-semibold text-kid-ink">
            Spell the word that means: {currentItem?.studentMeaningEn}
          </p>
          {currentItem?.exampleSentence ? (
            <p className="text-xs font-bold text-kid-ink/70">Example: {currentItem.exampleSentence}</p>
          ) : null}
          <input
            className="w-full rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-semibold text-kid-ink"
            onChange={(event) => setValue(event.target.value)}
            value={value}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={feedback !== null || !value.trim()}
              onClick={handleSubmitAnswer}
              type="button"
            >
              Check spelling
            </button>
            <button
              className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={feedback === null}
              onClick={handleNext}
              type="button"
            >
              Next
            </button>
          </div>
          {feedback ? (
            <p
              className={`rounded-md border p-2 text-sm font-bold ${
                feedback === "correct"
                  ? "border-green-300 bg-green-50 text-green-900"
                  : "border-red-300 bg-red-50 text-red-900"
              }`}
            >
              {feedback === "correct"
                ? "Correct."
                : `Not quite. Expected answer: ${currentItem?.word}.`}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-extrabold text-kid-ink"
          onClick={handleRetry}
          type="button"
        >
          Try again
        </button>
        <Link
          className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-extrabold text-kid-ink"
          href="/secondary"
        >
          Back to vocabulary home
        </Link>
      </div>
    </section>
  );
}
