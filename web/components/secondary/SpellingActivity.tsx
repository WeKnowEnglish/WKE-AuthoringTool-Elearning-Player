"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearSecondaryTodayActivityCompletion,
  getOrCreateSecondaryTodaySession,
  setSecondaryTodayActivityCompletion,
} from "@/lib/secondary/secondary-today-session";
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import { recordSecondaryWordAttempt } from "@/lib/secondary/secondary-word-progress";
import type { SecondaryTodaySession, SecondaryVocabItem } from "@/lib/secondary/types";

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

function scoreToPercent(correctCount: number, totalCount: number): number {
  if (!totalCount) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

export function SpellingActivity() {
  const [todaySession, setTodaySession] = useState<SecondaryTodaySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [value, setValue] = useState("");
  const [results, setResults] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  useEffect(() => {
    setTodaySession(getOrCreateSecondaryTodaySession(new Date()));
  }, []);

  const todayPrompts: SecondaryVocabItem[] = useMemo(() => {
    if (!todaySession) return [];
    return getSecondaryVocabItemsByIds(todaySession.allWordItemIds);
  }, [todaySession]);

  const totalCount = todayPrompts.length;
  const currentItem = todayPrompts[currentIndex];
  const isFinished = totalCount === 0 ? true : currentIndex >= totalCount;
  const scorePercent = useMemo(
    () => scoreToPercent(results.filter(Boolean).length, totalCount),
    [results, totalCount],
  );

  useEffect(() => {
    if (!todaySession) return;
    setCurrentIndex(0);
    setValue("");
    setResults([]);
    setFeedback(null);
  }, [todaySession]);

  if (!todaySession) {
    return (
      <section className="space-y-3 rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-sm font-semibold text-kid-ink/80">Loading today&apos;s practice...</p>
      </section>
    );
  }

  if (todayPrompts.length === 0) {
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

  function handleSubmitAnswer() {
    if (isFinished || !currentItem) return;

    const isCorrect = normalizeAnswer(currentItem.word) === normalizeAnswer(value);
    recordSecondaryWordAttempt({
      activityType: "spelling",
      wordItemId: currentItem.wordItemId,
      isCorrect,
      attemptedAt: new Date().toISOString(),
    });

    setResults((current) => [...current, isCorrect]);
    setFeedback(isCorrect ? "correct" : "incorrect");
  }

  function handleNext() {
    if (isFinished) return;

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setValue("");
    setFeedback(null);

    if (nextIndex >= totalCount) {
      const correctCount = results.filter(Boolean).length;
      const percent = scoreToPercent(correctCount, totalCount);
      setSecondaryTodayActivityCompletion(
        "spelling",
        { completed: true, percent, completedAt: new Date().toISOString() },
        new Date(),
      );
    }
  }

  function handleRetry() {
    setCurrentIndex(0);
    setValue("");
    setResults([]);
    setFeedback(null);
    clearSecondaryTodayActivityCompletion("spelling", new Date());
  }

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Spelling Activity</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        Type the correct vocabulary word for each prompt.
      </p>

      {isFinished ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h3 className="text-sm font-extrabold text-green-900">Completed</h3>
          <p className="mt-1 text-sm font-bold text-green-900">
            Final score: {results.filter(Boolean).length}/{totalCount} ({scorePercent}%)
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-kid-ink/20 bg-kid-panel p-4">
          <p className="text-xs font-extrabold text-kid-ink/70">
            Item {currentIndex + 1} of {totalCount}
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
