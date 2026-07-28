"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SecondaryActivitySummary } from "@/components/secondary/SecondaryActivitySummary";
import {
  buildFallbackActivityOutcomesFromLocal,
  clearSecondaryActivityAttemptSnapshot,
  getSecondaryActivityAttemptSnapshot,
  saveSecondaryActivityAttemptSnapshot,
} from "@/lib/secondary/secondary-activity-attempt-snapshot";
import { useSecondaryActivityMode } from "@/lib/secondary/use-secondary-activity-mode";
import { isSecondarySpellingAnswerCorrect } from "@/lib/secondary/secondary-activity-answers";
import {
  buildSecondaryDailyWordSetFingerprint,
  wordItemIdsFromSetKey,
} from "@/lib/secondary/secondary-activity-session-key";
import { formatSecondarySyllableHint } from "@/lib/secondary/secondary-learn-content";
import { filterWordItemIdsForSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import {
  attemptsToSuccessFromWrongAttempts,
  buildSecondaryActivityScoreSummary,
  createPendingOutcomes,
  getSecondaryPendingWordIds,
  SECONDARY_MAX_WRONG_ATTEMPTS,
} from "@/lib/secondary/secondary-scaffold";
import {
  clearSecondaryTodayActivityCompletion,
  getSecondaryTodayCompletion,
  setSecondaryTodayActivityCompletion,
} from "@/lib/secondary/secondary-today-session";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { useSecondaryActivityResetGuard } from "@/lib/secondary/use-secondary-activity-reset-guard";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import {
  clearSecondaryLocalActivitySession,
  finalizeSecondaryWordAsRevealed,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";
import type { SecondaryVocabItem } from "@/lib/secondary/types";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

const SPELLING_CORRECT_PAUSE_MS = 750;

export function SpellingActivity() {
  const { todaySession } = useSecondaryTodaySession();
  const { isReviewMode, isRetry } = useSecondaryActivityMode();
  const studentId = resolveSecondaryStudentId();
  const { shouldSkipInit, noteInitialized, markFinished, clearFinished } =
    useSecondaryActivityResetGuard();
  const retryHandledRef = useRef(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [outcomes, setOutcomes] = useState<Record<string, SecondaryWordOutcome>>({});
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | "revealed" | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const outcomesRef = useRef(outcomes);
  outcomesRef.current = outcomes;
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spellingDateKey = todaySession?.dateKey ?? "";
  const spellingWordSetKey = todaySession?.allWordItemIds.join(",") ?? "";

  const spellingWordIds = useMemo(() => {
    if (!spellingWordSetKey) return [];
    return filterWordItemIdsForSecondaryActivity(
      wordItemIdsFromSetKey(spellingWordSetKey),
      "spelling",
    );
  }, [spellingWordSetKey]);

  const spellingActivityFingerprint = buildSecondaryDailyWordSetFingerprint(
    spellingDateKey,
    spellingWordIds,
    "spelling",
  );

  const requiredWordIdsKey = spellingWordIds.join(",");

  const todayPrompts: SecondaryVocabItem[] = useMemo(() => {
    if (!requiredWordIdsKey) return [];
    return getSecondaryVocabItemsByIds(wordItemIdsFromSetKey(requiredWordIdsKey));
  }, [requiredWordIdsKey]);

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

  function persistSpellingSnapshot(
    nextOutcomes: Record<string, SecondaryWordOutcome>,
    percent: number,
    completedAt: string,
  ) {
    if (!studentId || !spellingDateKey || requiredWordIds.length === 0) return;

    saveSecondaryActivityAttemptSnapshot({
      version: 1,
      activityKey: "spelling",
      studentId,
      dateKey: spellingDateKey,
      completedAt,
      percent,
      wordItemIds: requiredWordIds,
      outcomes: nextOutcomes,
    });
  }

  function restoreDoneState(nextOutcomes: Record<string, SecondaryWordOutcome>) {
    markFinished();
    if (spellingActivityFingerprint) {
      noteInitialized(spellingActivityFingerprint);
    }
    setQueue([]);
    setValue("");
    setOutcomes(nextOutcomes);
    setFeedback(null);
    setIsComplete(true);
  }

  function resetSpellingPractice(ids: string[]) {
    if (spellingActivityFingerprint) {
      noteInitialized(spellingActivityFingerprint);
    }
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    setQueue([...ids]);
    setValue("");
    setOutcomes(createPendingOutcomes(ids));
    setFeedback(null);
    setIsComplete(false);
  }

  useEffect(() => {
    if (!spellingActivityFingerprint || !requiredWordIdsKey) return;
    if (shouldSkipInit(spellingActivityFingerprint) && !isRetry) return;

    const ids = wordItemIdsFromSetKey(requiredWordIdsKey);

    if (isRetry && !retryHandledRef.current) {
      retryHandledRef.current = true;
      clearFinished();
      const now = new Date();
      clearSecondaryLocalActivitySession("spelling", now);
      clearSecondaryTodayActivityCompletion("spelling", now);
      if (studentId && spellingDateKey) {
        clearSecondaryActivityAttemptSnapshot("spelling", studentId, spellingDateKey);
      }
      resetSpellingPractice(ids);
      return;
    }

    const snapshot =
      studentId && spellingDateKey
        ? getSecondaryActivityAttemptSnapshot("spelling", studentId, spellingDateKey)
        : null;

    if (isReviewMode && snapshot) {
      restoreDoneState(snapshot.outcomes);
      return;
    }

    if (isReviewMode) {
      const fallbackOutcomes =
        studentId && spellingDateKey
          ? buildFallbackActivityOutcomesFromLocal("spelling", studentId, spellingDateKey, ids)
          : null;
      if (fallbackOutcomes) {
        restoreDoneState(fallbackOutcomes);
        return;
      }
    }

    const saved = getSecondaryTodayCompletion(new Date()).spelling;
    if (saved?.completed) {
      if (snapshot) {
        restoreDoneState(snapshot.outcomes);
        return;
      }

      const fallbackOutcomes =
        studentId && spellingDateKey
          ? buildFallbackActivityOutcomesFromLocal("spelling", studentId, spellingDateKey, ids)
          : null;
      if (fallbackOutcomes) {
        restoreDoneState(fallbackOutcomes);
        return;
      }
    }

    resetSpellingPractice(ids);
  }, [
    shouldSkipInit,
    noteInitialized,
    markFinished,
    spellingActivityFingerprint,
    requiredWordIdsKey,
    isReviewMode,
    isRetry,
    studentId,
    spellingDateKey,
  ]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isComplete || feedback !== null || !currentItem) return;
    inputRef.current?.focus();
  }, [currentWordItemId, isComplete, feedback, currentItem]);

  useEffect(() => {
    if (feedback !== "revealed") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      advanceQueue(outcomesRef.current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [feedback, currentWordItemId]);

  function advanceQueue(nextOutcomes: Record<string, SecondaryWordOutcome>) {
    const now = new Date();
    const stillPending = getSecondaryPendingWordIds(nextOutcomes, requiredWordIds);
    if (stillPending.length === 0) {
      const summary = buildSecondaryActivityScoreSummary(nextOutcomes, requiredWordIds);
      markFinished();
      setSecondaryTodayActivityCompletion(
        "spelling",
        {
          completed: true,
          percent: summary.percentUnderstood,
          completedAt: now.toISOString(),
        },
        now,
      );
      persistSpellingSnapshot(nextOutcomes, summary.percentUnderstood, now.toISOString());
      setQueue([]);
      setIsComplete(true);
      setFeedback(null);
      setValue("");
      return;
    }

    const currentId = queue[0] ?? null;
    const currentIndex = currentId ? queue.indexOf(currentId) : -1;
    const rest =
      currentIndex >= 0
        ? [...queue.slice(0, currentIndex), ...queue.slice(currentIndex + 1)]
        : queue.slice(1);
    const nextWord = rest.find((id) => stillPending.includes(id)) ?? stillPending[0];
    const reordered = [nextWord, ...rest.filter((id) => id !== nextWord)];
    setQueue(reordered);
    setValue("");
    setFeedback(null);
  }

  function scheduleAdvanceAfterCorrect(nextOutcomes: Record<string, SecondaryWordOutcome>) {
    setFeedback("correct");
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => {
      advanceTimeoutRef.current = null;
      advanceQueue(nextOutcomes);
    }, SPELLING_CORRECT_PAUSE_MS);
  }

  function handleSubmitAnswer() {
    if (isComplete || !currentItem || !currentWordItemId) return;
    if (feedback !== null && feedback !== "incorrect") return;
    if (!value.trim()) return;

    const outcome = outcomes[currentWordItemId];
    if (!outcome || outcome.kind !== "pending") return;

    const isCorrect = isSecondarySpellingAnswerCorrect(currentItem, value);
    const now = new Date();
    const attemptedAt = now.toISOString();

    recordSecondaryWordAttempt({
      activityType: "spelling",
      wordItemId: currentItem.wordItemId,
      isCorrect,
      attemptedAt,
    });

    if (isCorrect) {
      const nextOutcomes = {
        ...outcomes,
        [currentWordItemId]: {
          kind: "success" as const,
          attemptsToSuccess: attemptsToSuccessFromWrongAttempts(outcome.wrongAttempts),
        },
      };
      setOutcomes(nextOutcomes);
      scheduleAdvanceAfterCorrect(nextOutcomes);
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
      const stillPending = getSecondaryPendingWordIds(nextOutcomes, requiredWordIds);
      if (stillPending.length === 0) {
        advanceQueue(nextOutcomes);
        return;
      }
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
    advanceQueue(outcomesRef.current);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    if (feedback === "correct") return;

    if (feedback === "revealed") {
      handleNext();
      return;
    }

    if (feedback === "incorrect") {
      if (value.trim()) {
        handleSubmitAnswer();
      } else {
        handleRetryAfterMiss();
      }
      return;
    }

    handleSubmitAnswer();
  }

  function handleRetryAfterMiss() {
    if (feedback !== "incorrect") return;
    setFeedback(null);
  }

  function handleRetry() {
    const now = new Date();
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    clearFinished();
    clearSecondaryLocalActivitySession("spelling", now);
    clearSecondaryTodayActivityCompletion("spelling", now);
    if (studentId && spellingDateKey) {
      clearSecondaryActivityAttemptSnapshot("spelling", studentId, spellingDateKey);
    }
    setQueue([...requiredWordIds]);
    setValue("");
    setOutcomes(createPendingOutcomes(requiredWordIds));
    setFeedback(null);
    setIsComplete(false);
    if (spellingActivityFingerprint) {
      noteInitialized(spellingActivityFingerprint);
    }
  }

  if (!todaySession) {
    return (
      <section className="space-y-3 rounded-xl border-2 border-sec-ink bg-white p-5">
        <p className={secondaryUi.bodyMuted}>Loading today&apos;s practice...</p>
      </section>
    );
  }

  if (requiredWordIds.length === 0) {
    return (
      <section className="space-y-4 rounded-xl border-2 border-sec-ink bg-white p-5">
        <h2 className={secondaryUi.pageTitle}>Spelling Activity</h2>
        <p className={secondaryUi.bodyMuted}>
          No spelling prompts are available in today&apos;s set.
        </p>
        <div className="flex items-center gap-2">
          <Link className={secondaryUi.btnSecondary} href="/secondary/learn">
            Back to Learn
          </Link>
        </div>
      </section>
    );
  }

  const queuePosition = Math.max(
    1,
    requiredWordIds.length - getSecondaryPendingWordIds(outcomes, requiredWordIds).length + 1,
  );
  const syllableHint =
    currentItem?.spellingSupport?.syllables &&
    currentPending &&
    currentPending.wrongAttempts >= 1
      ? formatSecondarySyllableHint(currentItem.spellingSupport.syllables)
      : null;
  const commonMistakes =
    currentItem?.spellingSupport?.commonMistakes &&
    currentPending &&
    currentPending.wrongAttempts >= 2
      ? currentItem.spellingSupport.commonMistakes
      : null;

  return (
    <section className="space-y-4 rounded-xl border-2 border-sec-ink bg-white p-5">
      <h2 className={secondaryUi.pageTitle}>Spelling Activity</h2>
      {isComplete ? (
        <p className={secondaryUi.bodyMuted}>
          {isReviewMode ? "Reviewing your last attempt." : "Here is how you did today."}
        </p>
      ) : null}

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
                  className={`rounded-lg border-2 px-3 py-2.5 ${secondaryUi.body} ${
                    isSuccess
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-red-500 bg-red-50 text-red-900"
                  }`}
                >
                  <span className="font-extrabold">{item?.word}</span>
                  {isSuccess && outcome.attemptsToSuccess > 1 ? (
                    <span className={`ml-2 ${secondaryUi.caption} font-bold text-green-800/80`}>
                      (try {outcome.attemptsToSuccess})
                    </span>
                  ) : null}
                  {isRevealed ? (
                    <span className={`ml-2 ${secondaryUi.caption} font-bold text-red-800/80`}>(needed help)</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      ) : currentItem ? (
        <div className="space-y-3 rounded-lg border border-sec-ink/20 bg-sec-panel p-4">
          <p className={`${secondaryUi.caption} font-extrabold text-sec-ink/70`}>
            Word {Math.min(queuePosition, requiredWordIds.length)} of {requiredWordIds.length}
            {currentPending && currentPending.wrongAttempts > 0
              ? ` · Attempt ${currentPending.wrongAttempts + 1} of ${SECONDARY_MAX_WRONG_ATTEMPTS}`
              : ""}
          </p>
          <div>
            <p className={secondaryUi.bodyLarge}>Read the sentence and write the word that means:</p>
            <p
              className={`mt-2 text-center ${secondaryUi.bodyLarge} font-extrabold leading-snug text-sec-ink`}
            >
              &ldquo;{currentItem.studentMeaningEn}&rdquo;
            </p>
          </div>
          {currentItem.exampleSentence ? (
            <p
              className={`mt-4 text-center ${secondaryUi.bodyLarge} font-extrabold leading-snug text-sec-ink`}
            >
              {currentItem.exampleSentence}
            </p>
          ) : null}
          {syllableHint ? (
            <p className={`rounded-md border-2 border-sky-200 bg-sky-50 px-3 py-2 ${secondaryUi.caption} text-sky-950`}>
              Syllable hint: <span className="font-mono text-lg font-extrabold">{syllableHint}</span>
            </p>
          ) : null}
          {commonMistakes && commonMistakes.length > 0 ? (
            <p className={`${secondaryUi.caption} text-amber-900`}>
              Watch out for: <span className="font-extrabold">{commonMistakes.join(", ")}</span>
            </p>
          ) : null}
          {feedback === "revealed" ? (
            <div className={`rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2.5 ${secondaryUi.body} font-bold text-red-900`}>
              Answer: {currentItem.word}
            </div>
          ) : (
            <div className="flex justify-center">
              <input
                ref={inputRef}
                className={`w-full max-w-sm text-center ${secondaryUi.inputField} ${
                  feedback === "incorrect"
                    ? "border-red-500 bg-red-50"
                    : feedback === "correct"
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-sec-ink"
                }`}
                disabled={feedback !== null && feedback !== "incorrect"}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleInputKeyDown}
                value={value}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {feedback === null || feedback === "incorrect" ? (
              <button
                className={secondaryUi.btnPrimary}
                disabled={feedback === "incorrect" ? !value.trim() : !value.trim()}
                onClick={handleSubmitAnswer}
                type="button"
              >
                {feedback === "incorrect" ? "Try again" : "Check spelling"}
              </button>
            ) : null}
            {feedback === "revealed" ? (
              <button className={secondaryUi.btnSecondary} onClick={handleNext} type="button">
                Next
              </button>
            ) : null}
          </div>
          {feedback === "correct" ? (
            <p className={`rounded-md border-2 border-green-300 bg-green-50 p-2 ${secondaryUi.body} font-bold text-green-900`}>
              Correct.
            </p>
          ) : null}
          {feedback === "incorrect" ? (
            <p className={`rounded-md border-2 border-red-300 bg-red-50 p-2 ${secondaryUi.body} font-bold text-red-900`}>
              Not quite — try once more.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button className={secondaryUi.btnSecondary} onClick={handleRetry} type="button">
          Try again
        </button>
        <Link className={secondaryUi.btnSecondary} href="/secondary/learn">
          Back to Learn
        </Link>
      </div>
    </section>
  );
}
