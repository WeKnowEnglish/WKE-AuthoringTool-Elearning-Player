"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearSecondaryTodayActivityCompletion,
  getOrCreateSecondaryTodaySession,
  setSecondaryTodayActivityCompletion,
} from "@/lib/secondary/secondary-today-session";
import {
  getSecondaryClozeTemplates,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
import { recordSecondaryWordAttempt } from "@/lib/secondary/secondary-word-progress";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

interface ClozeResult {
  correctByIndex: Array<boolean | null>;
  percent: number;
}

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

function scoreToPercent(correctCount: number, totalCount: number): number {
  if (!totalCount) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

export function ClozeActivity() {
  const [todaySession, setTodaySession] = useState<SecondaryTodaySession | null>(null);
  const template = getSecondaryClozeTemplates()[0];

  const [answers, setAnswers] = useState<string[]>(() => template.blankWordItemIds.map(() => ""));
  const [result, setResult] = useState<ClozeResult | null>(null);

  const wordBank = useMemo(() => {
    const answerWords = template.blankWordItemIds
      .map((id) => getSecondaryVocabItemById(id)?.word)
      .filter((word): word is string => Boolean(word));
    return Array.from(new Set([...answerWords, ...template.distractorWords]));
  }, [template]);

  useEffect(() => {
    setTodaySession(getOrCreateSecondaryTodaySession(new Date()));
  }, []);

  useEffect(() => {
    if (!todaySession) return;
    setAnswers(template.blankWordItemIds.map(() => ""));
    setResult(null);
  }, [todaySession, template.blankWordItemIds]);

  if (!todaySession) {
    return (
      <section className="space-y-3 rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-sm font-semibold text-kid-ink/80">Loading today&apos;s practice...</p>
      </section>
    );
  }

  const todayWordSet = new Set(todaySession.allWordItemIds);
  const blankPracticed = template.blankWordItemIds.map((id) => todayWordSet.has(id));
  const practicedCount = blankPracticed.filter(Boolean).length;

  function setBlankValue(index: number, value: string) {
    if (!blankPracticed[index]) return;
    setAnswers((current) => current.map((entry, currentIndex) => (currentIndex === index ? value : entry)));
    setResult(null);
  }

  function handleCheckAnswers() {
    const correctByIndex: Array<boolean | null> = template.blankWordItemIds.map((wordItemId, index) => {
      if (!blankPracticed[index]) return null;
      const expected = getSecondaryVocabItemById(wordItemId)?.word ?? "";
      const isCorrect = normalizeAnswer(expected) === normalizeAnswer(answers[index]);
      recordSecondaryWordAttempt({
        activityType: "cloze",
        wordItemId,
        isCorrect,
        attemptedAt: new Date().toISOString(),
      });
      return isCorrect;
    });

    const correctCount = correctByIndex.filter((v) => v === true).length;
    const percent = scoreToPercent(correctCount, practicedCount);
    setResult({ correctByIndex, percent });

    setSecondaryTodayActivityCompletion(
      "cloze",
      { completed: true, percent, completedAt: new Date().toISOString() },
      new Date(),
    );
  }

  function handleRetry() {
    setAnswers(template.blankWordItemIds.map(() => ""));
    setResult(null);
    clearSecondaryTodayActivityCompletion("cloze", new Date());
  }

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Cloze Paragraph</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        Fill each blank with the correct vocabulary word from the word bank.
      </p>

      {practicedCount === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          No cloze practice is available in today&apos;s set.
        </div>
      ) : null}

      <article className="rounded-lg border border-kid-ink/20 bg-kid-panel p-4">
        <h3 className="text-sm font-extrabold text-kid-ink">{template.title}</h3>
        <p className="mt-2 text-sm font-semibold text-kid-ink/80">{template.paragraph}</p>
      </article>

      <div className="flex flex-wrap gap-2">
        {wordBank.map((word) => (
          <span
            key={word}
            className="rounded-full border border-kid-ink/30 bg-white px-2 py-1 text-xs font-bold text-kid-ink"
          >
            {word}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {template.blankWordItemIds.map((wordItemId, index) => {
          const isCorrect = result?.correctByIndex[index] === true;
          const isIncorrect = result?.correctByIndex[index] === false;
          const isInToday = blankPracticed[index];
          return (
            <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={wordItemId}>
              <label className="text-sm font-bold text-kid-ink" htmlFor={`cloze-${index}`}>
                Blank {index + 1}
              </label>
              <input
                className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold text-kid-ink ${
                  isCorrect
                    ? "border-green-500 bg-green-50"
                    : isIncorrect
                      ? "border-red-500 bg-red-50"
                      : "border-kid-ink bg-white"
                }`}
                disabled={!isInToday}
                id={`cloze-${index}`}
                onChange={(event) => setBlankValue(index, event.target.value)}
                placeholder={isInToday ? "Type the word" : "Not in today's set"}
                value={isInToday ? answers[index] : ""}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={practicedCount === 0}
          onClick={handleCheckAnswers}
          type="button"
        >
          Check answers
        </button>
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

      {result ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-bold text-green-900">
          Score: {result.percent}%
        </div>
      ) : null}
    </section>
  );
}
