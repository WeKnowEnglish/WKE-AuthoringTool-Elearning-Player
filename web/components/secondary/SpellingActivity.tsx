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
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import {
  clearSecondaryLocalActivitySession,
  finalizeSecondaryWordAsRevealed,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase();
}

export function SpellingActivity() {
  const { todaySession } = useSecondaryTodaySession();
  const [queue, setQueue] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [outcomes, setOutcomes] = useState<Record<string, SecondaryWordOutcome>>({});
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | "revealed" | null>(null);
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
  const currentOutcome =
    currentWordItemId ? outcomes[currentWordItemId] : undefined;
  const currentPending = currentOutcome?.kind === "pending" ? currentOutcome : null;

  const scoreSummary = useMemo(
    () => buildSecondaryActivityScoreSummary(outcomes, requiredWordIds),
    [outcomes, requiredWordIds],
  );

  useEffect(() => {
    if (!todaySession) return;
    setQueue([...requiredWordIds]);
    setValue("");
    setOutcomes(createPendingOutcomes(requiredWordIds));
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

  function advanceQueue(nextOutcomes: Record<string, SecondaryWordOutcome>) {
    const now = new Date();
    const stillPending = getSecondaryPendingWordIds(nextOutcomes, requiredWordIds);
    if (stillPending.length === 0) {
      const summary = buildSecondaryActivityScoreSummary(nextOutcomes, requiredWordIds);
      setSecondaryTodayActivityCompletion(
        "spelling",
        {
          completed: true,
          percent: summary.percentUnderstood,
          completedAt: now.toISOString(),
        },
        now,
      );
      setQueue([]);
      setIsComplete(true);
      setFeedback(null);
      setValue("");
      return;
    }

    const currentIndex = currentWordItemId ? queue.indexOf(currentWordItemId) : -1;
    const rest =
      currentIndex >= 0 ? [...queue.slice(0, currentIndex), ...queue.slice(currentIndex + 1)] : queue.slice(1);
    const nextWord = rest.find((id) => stillPending.includes(id)) ?? stillPending[0];
    const reordered = [nextWord, ...rest.filter((id) => id !== nextWord)];
    setQueue(reordered);
    setValue("");
    setFeedback(null);
  }

  function handleSubmitAnswer() {
    if (isComplete || !currentItem || !currentWordItemId || feedback !== null) return;
    const outcome = outcomes[currentWordItemId];
    if (!outcome || outcome.kind !== "pending") return;

    const isCorrect = normalizeAnswer(currentItem.word) === normalizeAnswer(value);
    const now = new Date();
    const attemptedAt = now.toISOString();

    recordSecondaryWordAttempt({
      activityType: "spelling",
      wordItemId: currentItem.wordItemId,
      isCorrect,
      attemptedAt,
    });

    if (isCorrect) {
      const attemptsToSuccess = attemptsToSuccessFromWrongAttempts(outcome.wrongAttempts);
      const nextOutcomes = {
        ...outcomes,
        [currentWordItemId]: { kind: "success" as const, attemptsToSuccess },
      };
      setOutcomes(nextOutcomes);
      setFeedback("correct");
      return;
    }

    const wrongAttempts = outcome.wrongAttempts + 1;
    if (wrongAttempts >= SECONDARY_MAX_WRONG_ATTEMPTS) {
      finalizeSecondaryWordAsRevealed("spelling", currentWordItemId, attemptedAt);
      const nextOutcomes = {
        ...outcomes,
        [currentWordItemId]: { kind: "revealed" as const },
      };
      setOutcomes(nextOutcomes);
      setFeedback("revealed");
      return;
    }

    setOutcomes({
      ...outcomes,
      [currentWordItemId]: { kind: "pending", wrongAttempts },
    });
    setFeedback("incorrect");
    setValue("");
  }

  function handleNext() {
    if (feedback === null || !currentWordItemId) return;
    if (feedback === "incorrect") return;
    advanceQueue(outcomes);
  }

  function handleRetryAfterMiss() {
    if (feedback !== "incorrect") return;
    setFeedback(null);
  }

  function handleRetry() {
    const now = new Date();
    clearSecondaryLocalActivitySession("spelling", now);
    clearSecondaryTodayActivityCompletion("spelling", now);
    setQueue([...requiredWordIds]);
    setValue("");
    setOutcomes(createPendingOutcomes(requiredWordIds));
    setFeedback(null);
    setIsComplete(false);
  }

  const queuePosition = Math.max(1, requiredWordIds.length - getSecondaryPendingWordIds(outcomes, requiredWordIds).length + 1);

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Spelling Activity</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        {isComplete
          ? "Here is how you did today."
          : "Type the correct word. You have up to three tries before we show the answer."}
      </p>

      {isComplete ? (
        <>
          <SecondaryActivitySummary activityLabel="Spelling" summary={scoreSummary} />
          <div className="space-y-2">
            {requiredWordIds.map((wordItemId) => {
              const item = promptById.get(wordItemId);
              const outcome = outcomes[wordItemId];
              const isSuccess = outcome?.kind === "success";
              const isRevealed = outcome?.kind === "revealed";
              return (
                <div
                  key={wordItemId}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                    isSuccess
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-red-500 bg-red-50 text-red-900"
                  }`}
                >
                  <span className="font-extrabold">{item?.word}</span>
                  {isSuccess && outcome.attemptsToSuccess > 1 ? (
                    <span className="ml-2 text-xs font-bold text-green-800/80">
                      (try {outcome.attemptsToSuccess})
                    </span>
                  ) : null}
                  {isRevealed ? (
                    <span className="ml-2 text-xs font-bold text-red-800/80">(needed help)</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : currentItem ? (
        <div className="space-y-3 rounded-lg border border-kid-ink/20 bg-kid-panel p-4">
          <p className="text-xs font-extrabold text-kid-ink/70">
            Word {Math.min(queuePosition, requiredWordIds.length)} of {requiredWordIds.length}
            {currentPending && currentPending.wrongAttempts > 0
              ? ` · Attempt ${currentPending.wrongAttempts + 1} of ${SECONDARY_MAX_WRONG_ATTEMPTS}`
              : ""}
          </p>
          <p className="text-sm font-semibold text-kid-ink">
            Spell the word that means: {currentItem.studentMeaningEn}
          </p>
          {currentItem.exampleSentence ? (
            <p className="text-xs font-bold text-kid-ink/70">Example: {currentItem.exampleSentence}</p>
          ) : null}
          {feedback === "revealed" ? (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2 text-sm font-bold text-red-900">
              Answer: {currentItem.word}
            </div>
          ) : (
            <input
              className={`w-full rounded-lg border-2 bg-white px-3 py-2 text-sm font-semibold text-kid-ink ${
                feedback === "incorrect" ? "border-red-500 bg-red-50" : "border-kid-ink"
              }`}
              disabled={feedback !== null && feedback !== "incorrect"}
              onChange={(event) => setValue(event.target.value)}
              value={value}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {feedback === null || feedback === "incorrect" ? (
              <button
                className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
                disabled={feedback === "incorrect" ? false : !value.trim()}
                onClick={feedback === "incorrect" ? handleRetryAfterMiss : handleSubmitAnswer}
                type="button"
              >
                {feedback === "incorrect" ? "Try again" : "Check spelling"}
              </button>
            ) : null}
            {feedback === "correct" || feedback === "revealed" ? (
              <button
                className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-extrabold text-kid-ink"
                onClick={handleNext}
                type="button"
              >
                Next
              </button>
            ) : null}
          </div>
          {feedback === "correct" ? (
            <p className="rounded-md border border-green-300 bg-green-50 p-2 text-sm font-bold text-green-900">
              Correct.
            </p>
          ) : null}
          {feedback === "incorrect" ? (
            <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm font-bold text-red-900">
              Not quite — try once more.
            </p>
          ) : null}
        </div>
      ) : null}

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
