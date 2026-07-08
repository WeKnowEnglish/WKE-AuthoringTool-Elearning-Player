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

interface MatchResult {
  correctCount: number;
  totalCount: number;
  percent: number;
}

function scoreToPercent(correctCount: number, totalCount: number): number {
  if (!totalCount) return 0;
  return Math.round((correctCount / totalCount) * 100);
}

function shuffleDefinitions(definitions: string[]): string[] {
  const copy = [...definitions];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

export function MatchActivity() {
  const [todaySession, setTodaySession] = useState<SecondaryTodaySession | null>(null);
  const [selectedDefinitions, setSelectedDefinitions] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MatchResult | null>(null);
  const [shuffledDefinitions, setShuffledDefinitions] = useState<string[]>([]);

  const matchItems: SecondaryVocabItem[] = useMemo(() => {
    if (!todaySession) return [];
    return getSecondaryVocabItemsByIds(todaySession.allWordItemIds);
  }, [todaySession]);

  const totalCount = matchItems.length;
  const canCheck =
    totalCount > 0 && matchItems.every((item) => Boolean(selectedDefinitions[item.wordItemId]));

  useEffect(() => {
    setTodaySession(getOrCreateSecondaryTodaySession(new Date()));
  }, []);

  useEffect(() => {
    if (!todaySession) return;
    setSelectedDefinitions({});
    setResult(null);
    setShuffledDefinitions(shuffleDefinitions(matchItems.map((item) => item.studentMeaningEn)));
  }, [todaySession, matchItems]);

  const correctnessByWordItemId = useMemo(() => {
    if (!result) return {};
    const map: Record<string, boolean> = {};
    for (const item of matchItems) {
      map[item.wordItemId] = selectedDefinitions[item.wordItemId] === item.studentMeaningEn;
    }
    return map;
  }, [result, selectedDefinitions, matchItems]);

  function handleSelectDefinition(wordItemId: string, definition: string) {
    setSelectedDefinitions((current) => ({
      ...current,
      [wordItemId]: definition,
    }));
    setResult(null);
  }

  function handleCheckAnswers() {
    let correctCount = 0;
    for (const item of matchItems) {
      const isCorrect = selectedDefinitions[item.wordItemId] === item.studentMeaningEn;
      if (isCorrect) correctCount += 1;

      recordSecondaryWordAttempt({
        activityType: "match",
        wordItemId: item.wordItemId,
        isCorrect,
        attemptedAt: new Date().toISOString(),
      });
    }

    const percent = scoreToPercent(correctCount, totalCount);
    setResult({ correctCount, totalCount, percent });

    setSecondaryTodayActivityCompletion(
      "match",
      { completed: true, percent, completedAt: new Date().toISOString() },
      new Date(),
    );
  }

  function handleRetry() {
    setSelectedDefinitions({});
    setResult(null);
    setShuffledDefinitions(shuffleDefinitions(matchItems.map((item) => item.studentMeaningEn)));
    clearSecondaryTodayActivityCompletion("match", new Date());
  }

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Match The Word To The Definition</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        Select one definition for each word, then check your answers.
      </p>

      {!todaySession ? <p className="text-sm font-semibold text-kid-ink/70">Loading today&apos;s practice...</p> : null}

      {todaySession && matchItems.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          No match practice is available in today&apos;s set.
        </div>
      ) : null}

      {todaySession && matchItems.length > 0 ? (
        <div className="space-y-3">
          {matchItems.map((item) => {
            const isCorrect = correctnessByWordItemId[item.wordItemId];
            const isIncorrect = result ? !isCorrect : false;
            return (
              <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={item.wordItemId}>
                <label className="text-sm font-bold text-kid-ink" htmlFor={`match-${item.wordItemId}`}>
                  {item.word}
                </label>
                <select
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold text-kid-ink ${
                    isCorrect
                      ? "border-green-500 bg-green-50"
                      : isIncorrect
                        ? "border-red-500 bg-red-50"
                        : "border-kid-ink bg-white"
                  }`}
                  id={`match-${item.wordItemId}`}
                  onChange={(event) => handleSelectDefinition(item.wordItemId, event.target.value)}
                  value={selectedDefinitions[item.wordItemId] ?? ""}
                >
                  <option value="">Choose a definition</option>
                  {shuffledDefinitions.map((definition) => (
                    <option key={definition} value={definition}>
                      {definition}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      ) : null}

      {todaySession && matchItems.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canCheck}
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
      ) : null}

      {result ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm font-bold text-green-900">
          Score: {result.correctCount}/{result.totalCount} ({result.percent}%)
        </div>
      ) : null}
    </section>
  );
}
