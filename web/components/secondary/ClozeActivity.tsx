"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import {
  clearSecondaryTodayActivityCompletion,
  setSecondaryTodayActivityCompletion,
} from "@/lib/secondary/secondary-today-session";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import {
  getSecondaryClozeTemplates,
  getSecondaryVocabItemById,
} from "@/lib/secondary/secondary-vocab-bank";
import {
  areSecondaryActivityWordsComplete,
  clearSecondaryLocalActivitySession,
  getSecondaryWordsNeedingRepair,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";

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
  const { todaySession } = useSecondaryTodaySession();
  const template = getSecondaryClozeTemplates()[0];

  const [answers, setAnswers] = useState<string[]>(() => template.blankWordItemIds.map(() => ""));
  const [result, setResult] = useState<ClozeResult | null>(null);
  const [phase, setPhase] = useState<"practice" | "repair" | "done">("practice");
  const [repairWordIds, setRepairWordIds] = useState<string[]>([]);

  const wordBank = useMemo(() => {
    const answerWords = template.blankWordItemIds
      .map((id) => getSecondaryVocabItemById(id)?.word)
      .filter((word): word is string => Boolean(word));
    return Array.from(new Set([...answerWords, ...template.distractorWords]));
  }, [template]);

  useEffect(() => {
    if (!todaySession) return;
    setAnswers(template.blankWordItemIds.map(() => ""));
    setResult(null);
    setPhase("practice");
    setRepairWordIds([]);
  }, [todaySession, template.blankWordItemIds]);

  const clozeEligibleSet = useMemo(() => {
    if (!todaySession) return new Set<string>();
    return new Set(
      filterWordItemIdsForSecondaryActivity(todaySession.allWordItemIds, "cloze"),
    );
  }, [todaySession]);

  const todayWordSet = useMemo(
    () => new Set(todaySession?.allWordItemIds ?? []),
    [todaySession],
  );

  const blankPracticed = template.blankWordItemIds.map(
    (id) => todayWordSet.has(id) && clozeEligibleSet.has(id),
  );
  const practicedWordIds = template.blankWordItemIds.filter((id, index) => blankPracticed[index]);
  const practicedCount = practicedWordIds.length;
  const repairSet = useMemo(() => new Set(repairWordIds), [repairWordIds]);

  if (!todaySession) {
    return (
      <section className="space-y-3 rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-sm font-semibold text-kid-ink/80">Loading today&apos;s practice...</p>
      </section>
    );
  }

  function setBlankValue(index: number, value: string) {
    if (!blankPracticed[index]) return;
    setAnswers((current) => current.map((entry, currentIndex) => (currentIndex === index ? value : entry)));
    setResult(null);
  }

  function finishIfComplete(now: Date, correctCount: number) {
    if (!areSecondaryActivityWordsComplete("cloze", practicedWordIds, now)) {
      const needing = getSecondaryWordsNeedingRepair("cloze", practicedWordIds, now);
      setRepairWordIds(needing);
      setPhase("repair");
      return false;
    }

    const percent = scoreToPercent(correctCount, practicedCount);
    setSecondaryTodayActivityCompletion(
      "cloze",
      { completed: true, percent, completedAt: now.toISOString() },
      now,
    );
    setPhase("done");
    setRepairWordIds([]);
    return true;
  }

  function handleCheckAnswers() {
    const now = new Date();
    const idsToCheck =
      phase === "repair"
        ? template.blankWordItemIds.filter((id, index) => blankPracticed[index] && repairSet.has(id))
        : practicedWordIds;

    const correctByIndex: Array<boolean | null> = template.blankWordItemIds.map((wordItemId, index) => {
      if (!blankPracticed[index]) return null;
      if (phase === "repair" && !repairSet.has(wordItemId)) {
        return result?.correctByIndex[index] ?? null;
      }
      if (!idsToCheck.includes(wordItemId)) return null;

      const expected = getSecondaryVocabItemById(wordItemId)?.word ?? "";
      const isCorrect = normalizeAnswer(expected) === normalizeAnswer(answers[index]);
      recordSecondaryWordAttempt({
        activityType: "cloze",
        wordItemId,
        isCorrect,
        attemptedAt: now.toISOString(),
      });
      return isCorrect;
    });

    const correctCount = correctByIndex.filter((v) => v === true).length;
    const percent = scoreToPercent(correctCount, practicedCount);
    setResult({ correctByIndex, percent });
    finishIfComplete(now, correctCount);
  }

  function handleRetry() {
    const now = new Date();
    clearSecondaryLocalActivitySession("cloze", now);
    clearSecondaryTodayActivityCompletion("cloze", now);
    setAnswers(template.blankWordItemIds.map(() => ""));
    setResult(null);
    setPhase("practice");
    setRepairWordIds([]);
  }

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Cloze Paragraph</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        {phase === "repair"
          ? "Repair round: fix the blanks you missed, then check again."
          : "Fill each blank with the correct vocabulary word from the word bank."}
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
          const isInToday = blankPracticed[index];
          const showBlank =
            phase !== "repair" || repairSet.has(wordItemId) || !isInToday;
          if (!showBlank) return null;

          const isCorrect = result?.correctByIndex[index] === true;
          const isIncorrect = result?.correctByIndex[index] === false;
          const locked = phase === "done";
          return (
            <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={wordItemId}>
              <label className="text-sm font-bold text-kid-ink" htmlFor={`cloze-${index}`}>
                Blank {index + 1}
              </label>
              <input
                className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold text-kid-ink disabled:opacity-70 ${
                  isCorrect
                    ? "border-green-500 bg-green-50"
                    : isIncorrect
                      ? "border-red-500 bg-red-50"
                      : "border-kid-ink bg-white"
                }`}
                disabled={!isInToday || locked}
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
        {phase !== "done" ? (
          <button
            className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={practicedCount === 0}
            onClick={handleCheckAnswers}
            type="button"
          >
            {phase === "repair" ? "Check repairs" : "Check answers"}
          </button>
        ) : null}
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
          {phase === "done" ? "Completed · " : phase === "repair" ? "Keep repairing · " : ""}
          Score: {result.percent}%
          {phase === "repair" && repairWordIds.length > 0
            ? ` · ${repairWordIds.length} still need repair`
            : ""}
        </div>
      ) : null}
    </section>
  );
}
