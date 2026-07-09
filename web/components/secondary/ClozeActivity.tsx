"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SecondaryActivitySummary } from "@/components/secondary/SecondaryActivitySummary";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import {
  attemptsToSuccessFromWrongAttempts,
  buildSecondaryActivityScoreSummary,
  createPendingOutcomes,
  getSecondaryPendingWordIds,
  isSecondaryWordOutcomeDone,
  SECONDARY_MAX_WRONG_ATTEMPTS,
} from "@/lib/secondary/secondary-scaffold";
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
  clearSecondaryLocalActivitySession,
  finalizeSecondaryWordAsRevealed,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export function ClozeActivity() {
  const { todaySession } = useSecondaryTodaySession();
  const template = getSecondaryClozeTemplates()[0];

  const [answers, setAnswers] = useState<string[]>(() => template.blankWordItemIds.map(() => ""));
  const [lockedAnswers, setLockedAnswers] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, SecondaryWordOutcome>>({});
  const [phase, setPhase] = useState<"practice" | "repair" | "done">("practice");
  const [checked, setChecked] = useState(false);

  const wordBank = useMemo(() => {
    const answerWords = template.blankWordItemIds
      .map((id) => getSecondaryVocabItemById(id)?.word)
      .filter((word): word is string => Boolean(word));
    return Array.from(new Set([...answerWords, ...template.distractorWords]));
  }, [template]);

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

  const practicedWordIds = useMemo(() => {
    return template.blankWordItemIds.filter(
      (id) => todayWordSet.has(id) && clozeEligibleSet.has(id),
    );
  }, [template.blankWordItemIds, todayWordSet, clozeEligibleSet]);
  const practicedCount = practicedWordIds.length;

  const pendingWordIds = useMemo(
    () => getSecondaryPendingWordIds(outcomes, practicedWordIds),
    [outcomes, practicedWordIds],
  );

  const scoreSummary = useMemo(
    () => buildSecondaryActivityScoreSummary(outcomes, practicedWordIds),
    [outcomes, practicedWordIds],
  );

  useEffect(() => {
    if (!todaySession) return;
    setAnswers(template.blankWordItemIds.map(() => ""));
    setLockedAnswers({});
    setOutcomes(createPendingOutcomes(practicedWordIds));
    setPhase("practice");
    setChecked(false);
  }, [todaySession, template.blankWordItemIds, practicedWordIds]);

  if (!todaySession) {
    return (
      <section className="space-y-3 rounded-xl border-2 border-kid-ink bg-white p-5">
        <p className="text-sm font-semibold text-kid-ink/80">Loading today&apos;s practice...</p>
      </section>
    );
  }

  function setBlankValue(index: number, value: string) {
    const wordItemId = template.blankWordItemIds[index];
    if (!practicedWordIds.includes(wordItemId) || isSecondaryWordOutcomeDone(outcomes[wordItemId])) return;
    setAnswers((current) =>
      current.map((entry, currentIndex) => (currentIndex === index ? value : entry)),
    );
    setChecked(false);
  }

  function handleCheckAnswers() {
    const now = new Date();
    const idsToCheck =
      phase === "repair" ? pendingWordIds : practicedWordIds;
    const nextOutcomes = { ...outcomes };
    const nextLocked = { ...lockedAnswers };
    const nextAnswers = [...answers];

    for (const wordItemId of idsToCheck) {
      const index = template.blankWordItemIds.indexOf(wordItemId);
      if (index < 0) continue;
      const outcome = nextOutcomes[wordItemId];
      if (!outcome || outcome.kind !== "pending") continue;

      const expected = getSecondaryVocabItemById(wordItemId)?.word ?? "";
      const isCorrect = normalizeAnswer(expected) === normalizeAnswer(answers[index]);
      const attemptedAt = now.toISOString();

      recordSecondaryWordAttempt({
        activityType: "cloze",
        wordItemId,
        isCorrect,
        attemptedAt,
      });

      if (isCorrect) {
        const attemptsToSuccess = attemptsToSuccessFromWrongAttempts(outcome.wrongAttempts);
        nextOutcomes[wordItemId] = { kind: "success", attemptsToSuccess };
        nextLocked[wordItemId] = expected;
      } else {
        const wrongAttempts = outcome.wrongAttempts + 1;
        if (wrongAttempts >= SECONDARY_MAX_WRONG_ATTEMPTS) {
          finalizeSecondaryWordAsRevealed("cloze", wordItemId, attemptedAt);
          nextOutcomes[wordItemId] = { kind: "revealed" };
          nextLocked[wordItemId] = expected;
        } else {
          nextOutcomes[wordItemId] = { kind: "pending", wrongAttempts };
          nextAnswers[index] = "";
        }
      }
    }

    setOutcomes(nextOutcomes);
    setLockedAnswers(nextLocked);
    setAnswers(nextAnswers);
    setChecked(true);

    const stillPending = getSecondaryPendingWordIds(nextOutcomes, practicedWordIds);
    if (stillPending.length === 0) {
      const summary = buildSecondaryActivityScoreSummary(nextOutcomes, practicedWordIds);
      setSecondaryTodayActivityCompletion(
        "cloze",
        {
          completed: true,
          percent: summary.percentUnderstood,
          completedAt: now.toISOString(),
        },
        now,
      );
      setPhase("done");
      return;
    }

    setPhase("repair");
  }

  function handleRetry() {
    const now = new Date();
    clearSecondaryLocalActivitySession("cloze", now);
    clearSecondaryTodayActivityCompletion("cloze", now);
    setAnswers(template.blankWordItemIds.map(() => ""));
    setLockedAnswers({});
    setOutcomes(createPendingOutcomes(practicedWordIds));
    setChecked(false);
    setPhase("practice");
  }

  const canCheck =
    phase !== "done" &&
    (phase === "repair" ? pendingWordIds : practicedWordIds).every((wordItemId) => {
      const index = template.blankWordItemIds.indexOf(wordItemId);
      return index >= 0 && Boolean(answers[index]?.trim());
    });

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Cloze Paragraph</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        {phase === "done"
          ? "Here is how you did today."
          : phase === "repair"
            ? "Fix the blanks you missed. You have up to three tries per word."
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

      {phase === "done" ? <SecondaryActivitySummary activityLabel="Cloze" summary={scoreSummary} /> : null}

      <div className="space-y-3">
        {template.blankWordItemIds.map((wordItemId, index) => {
          const isInToday = practicedWordIds.includes(wordItemId);
          const outcome = outcomes[wordItemId];
          const pending = outcome?.kind === "pending" ? outcome : null;
          const isSuccess = outcome?.kind === "success";
          const isRevealed = outcome?.kind === "revealed";
          const showInRepair = phase !== "repair" || pending;
          const showInDone = phase === "done" && isInToday;
          const showInPractice = phase !== "done" && phase !== "repair" && isInToday;
          const showRow = showInDone || (showInRepair && (showInPractice || pending));

          if (!showRow || !isInToday) return null;

          if (phase === "done") {
            return (
              <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={wordItemId}>
                <span className="text-sm font-bold text-kid-ink">Blank {index + 1}</span>
                <div
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                    isSuccess
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-red-500 bg-red-50 text-red-900"
                  }`}
                >
                  {lockedAnswers[wordItemId] ?? getSecondaryVocabItemById(wordItemId)?.word}
                  {isSuccess && outcome.attemptsToSuccess > 1 ? (
                    <span className="ml-2 text-xs font-bold text-green-800/80">
                      (try {outcome.attemptsToSuccess})
                    </span>
                  ) : null}
                  {isRevealed ? (
                    <span className="ml-2 text-xs font-bold text-red-800/80">(needed help)</span>
                  ) : null}
                </div>
              </div>
            );
          }

          const showWrong = checked && pending && pending.wrongAttempts > 0 && !answers[index]?.trim();

          return (
            <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={wordItemId}>
              <div>
                <label className="text-sm font-bold text-kid-ink" htmlFor={`cloze-${index}`}>
                  Blank {index + 1}
                </label>
                {pending && pending.wrongAttempts > 0 ? (
                  <p className="text-xs font-semibold text-red-800/80">
                    Attempt {pending.wrongAttempts + 1} of {SECONDARY_MAX_WRONG_ATTEMPTS}
                  </p>
                ) : null}
              </div>
              <input
                className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold text-kid-ink ${
                  showWrong ? "border-red-500 bg-red-50" : "border-kid-ink bg-white"
                }`}
                id={`cloze-${index}`}
                onChange={(event) => setBlankValue(index, event.target.value)}
                placeholder="Type the word"
                value={answers[index]}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {phase !== "done" ? (
          <button
            className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={practicedCount === 0 || !canCheck}
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

      {phase === "repair" && pendingWordIds.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Keep going · {pendingWordIds.length} blank{pendingWordIds.length === 1 ? "" : "s"} still to
          fix
        </div>
      ) : null}
    </section>
  );
}
