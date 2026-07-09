"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SecondaryActivitySummary } from "@/components/secondary/SecondaryActivitySummary";
import {
  buildSecondaryDailyWordSetFingerprint,
  wordItemIdsFromSetKey,
} from "@/lib/secondary/secondary-activity-session-key";
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
  getSecondaryTodayCompletion,
  setSecondaryTodayActivityCompletion,
} from "@/lib/secondary/secondary-today-session";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { useSecondaryActivityResetGuard } from "@/lib/secondary/use-secondary-activity-reset-guard";
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import {
  clearSecondaryLocalActivitySession,
  finalizeSecondaryWordAsRevealed,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

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
  const { todaySession } = useSecondaryTodaySession();
  const { shouldSkipInit, noteInitialized, markFinished, clearFinished } =
    useSecondaryActivityResetGuard();
  const [selectedDefinitions, setSelectedDefinitions] = useState<Record<string, string>>({});
  const [lockedSelections, setLockedSelections] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, SecondaryWordOutcome>>({});
  const [shuffledDefinitions, setShuffledDefinitions] = useState<string[]>([]);
  const [phase, setPhase] = useState<"practice" | "repair" | "done">("practice");
  const [checked, setChecked] = useState(false);

  const matchDateKey = todaySession?.dateKey ?? "";
  const matchWordSetKey = todaySession?.allWordItemIds.join(",") ?? "";

  const matchWordIds = useMemo(() => {
    if (!matchWordSetKey) return [];
    return filterWordItemIdsForSecondaryActivity(
      wordItemIdsFromSetKey(matchWordSetKey),
      "match",
    );
  }, [matchWordSetKey]);

  const matchActivityFingerprint = buildSecondaryDailyWordSetFingerprint(
    matchDateKey,
    matchWordIds,
    "match",
  );

  const requiredWordIdsKey = matchWordIds.join(",");

  const matchItems: SecondaryVocabItem[] = useMemo(() => {
    if (!requiredWordIdsKey) return [];
    return getSecondaryVocabItemsByIds(wordItemIdsFromSetKey(requiredWordIdsKey));
  }, [requiredWordIdsKey]);

  const requiredWordIds = useMemo(() => matchItems.map((item) => item.wordItemId), [matchItems]);

  const pendingWordIds = useMemo(
    () => getSecondaryPendingWordIds(outcomes, requiredWordIds),
    [outcomes, requiredWordIds],
  );

  const visibleItems = useMemo(() => {
    if (phase === "repair") {
      const pending = new Set(pendingWordIds);
      return matchItems.filter((item) => pending.has(item.wordItemId));
    }
    if (phase === "done") return matchItems;
    return matchItems;
  }, [phase, pendingWordIds, matchItems]);

  const scoreSummary = useMemo(
    () => buildSecondaryActivityScoreSummary(outcomes, requiredWordIds),
    [outcomes, requiredWordIds],
  );

  const canCheck =
    phase !== "done" &&
    visibleItems.length > 0 &&
    visibleItems.every((item) => Boolean(selectedDefinitions[item.wordItemId]));

  useEffect(() => {
    if (!matchActivityFingerprint || !requiredWordIdsKey) return;
    if (shouldSkipInit(matchActivityFingerprint)) return;

    const items = getSecondaryVocabItemsByIds(wordItemIdsFromSetKey(requiredWordIdsKey));
    const saved = getSecondaryTodayCompletion(new Date()).match;
    if (saved?.completed) {
      markFinished();
      noteInitialized(matchActivityFingerprint);
      setSelectedDefinitions({});
      setLockedSelections({});
      setOutcomes(createPendingOutcomes(items.map((item) => item.wordItemId)));
      setPhase("done");
      setChecked(false);
      setShuffledDefinitions(shuffleDefinitions(items.map((item) => item.studentMeaningEn)));
      return;
    }

    noteInitialized(matchActivityFingerprint);
    setSelectedDefinitions({});
    setLockedSelections({});
    setOutcomes(createPendingOutcomes(items.map((item) => item.wordItemId)));
    setPhase("practice");
    setChecked(false);
    setShuffledDefinitions(shuffleDefinitions(items.map((item) => item.studentMeaningEn)));
  }, [shouldSkipInit, noteInitialized, markFinished, matchActivityFingerprint, requiredWordIdsKey]);

  function handleSelectDefinition(wordItemId: string, definition: string) {
    if (isSecondaryWordOutcomeDone(outcomes[wordItemId])) return;
    setSelectedDefinitions((current) => ({
      ...current,
      [wordItemId]: definition,
    }));
    setChecked(false);
  }

  function completeActivity(now: Date) {
    markFinished();
    setSecondaryTodayActivityCompletion(
      "match",
      {
        completed: true,
        percent: scoreSummary.percentUnderstood,
        completedAt: now.toISOString(),
      },
      now,
    );
    setPhase("done");
    setChecked(false);
  }

  function handleCheckAnswers() {
    const now = new Date();
    const nextOutcomes = { ...outcomes };
    const nextLocked = { ...lockedSelections };
    const nextSelected = { ...selectedDefinitions };

    for (const item of visibleItems) {
      const outcome = nextOutcomes[item.wordItemId];
      if (!outcome || outcome.kind !== "pending") continue;

      const isCorrect = selectedDefinitions[item.wordItemId] === item.studentMeaningEn;
      const attemptedAt = now.toISOString();

      recordSecondaryWordAttempt({
        activityType: "match",
        wordItemId: item.wordItemId,
        isCorrect,
        attemptedAt,
      });

      if (isCorrect) {
        const attemptsToSuccess = attemptsToSuccessFromWrongAttempts(outcome.wrongAttempts);
        nextOutcomes[item.wordItemId] = { kind: "success", attemptsToSuccess };
        nextLocked[item.wordItemId] = item.studentMeaningEn;
      } else {
        const wrongAttempts = outcome.wrongAttempts + 1;
        if (wrongAttempts >= SECONDARY_MAX_WRONG_ATTEMPTS) {
          finalizeSecondaryWordAsRevealed("match", item.wordItemId, attemptedAt);
          nextOutcomes[item.wordItemId] = { kind: "revealed" };
          nextLocked[item.wordItemId] = item.studentMeaningEn;
        } else {
          nextOutcomes[item.wordItemId] = { kind: "pending", wrongAttempts };
          delete nextSelected[item.wordItemId];
        }
      }
    }

    setOutcomes(nextOutcomes);
    setLockedSelections(nextLocked);
    setSelectedDefinitions(nextSelected);
    setChecked(true);

    const stillPending = getSecondaryPendingWordIds(nextOutcomes, requiredWordIds);
    if (stillPending.length === 0) {
      const summary = buildSecondaryActivityScoreSummary(nextOutcomes, requiredWordIds);
      markFinished();
      setSecondaryTodayActivityCompletion(
        "match",
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
    clearFinished();
    clearSecondaryLocalActivitySession("match", now);
    clearSecondaryTodayActivityCompletion("match", now);
    setSelectedDefinitions({});
    setLockedSelections({});
    setOutcomes(createPendingOutcomes(requiredWordIds));
    setChecked(false);
    setPhase("practice");
    setShuffledDefinitions(shuffleDefinitions(matchItems.map((item) => item.studentMeaningEn)));
    if (matchActivityFingerprint) {
      noteInitialized(matchActivityFingerprint);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Match The Word To The Definition</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        {phase === "done"
          ? "Here is how you did today."
          : phase === "repair"
            ? "Fix the words you missed. You have up to three tries per word."
            : "Select one definition for each word, then check your answers."}
      </p>

      {!todaySession ? <p className="text-sm font-semibold text-kid-ink/70">Loading today&apos;s practice...</p> : null}

      {todaySession && matchItems.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          No match practice is available in today&apos;s set.
        </div>
      ) : null}

      {phase === "done" ? (
        <SecondaryActivitySummary activityLabel="Match" summary={scoreSummary} />
      ) : null}

      {todaySession && phase === "done" ? (
        <div className="space-y-3">
          {matchItems.map((item) => {
            const outcome = outcomes[item.wordItemId];
            const isSuccess = outcome?.kind === "success";
            const isRevealed = outcome?.kind === "revealed";
            return (
              <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={item.wordItemId}>
                <span className="text-sm font-bold text-kid-ink">{item.word}</span>
                <div
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                    isSuccess
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-red-500 bg-red-50 text-red-900"
                  }`}
                >
                  {lockedSelections[item.wordItemId] ?? item.studentMeaningEn}
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
          })}
        </div>
      ) : null}

      {todaySession && visibleItems.length > 0 && phase !== "done" ? (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const outcome = outcomes[item.wordItemId];
            const pending = outcome?.kind === "pending" ? outcome : null;
            const showWrong = checked && pending && !selectedDefinitions[item.wordItemId];
            return (
              <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={item.wordItemId}>
                <div>
                  <label className="text-sm font-bold text-kid-ink" htmlFor={`match-${item.wordItemId}`}>
                    {item.word}
                  </label>
                  {pending && pending.wrongAttempts > 0 ? (
                    <p className="text-xs font-semibold text-red-800/80">
                      Attempt {pending.wrongAttempts + 1} of {SECONDARY_MAX_WRONG_ATTEMPTS}
                    </p>
                  ) : null}
                </div>
                <select
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold text-kid-ink ${
                    showWrong ? "border-red-500 bg-red-50" : "border-kid-ink bg-white"
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
          {phase !== "done" ? (
            <button
              className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canCheck}
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
      ) : null}

      {phase === "repair" && pendingWordIds.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Keep going · {pendingWordIds.length} word{pendingWordIds.length === 1 ? "" : "s"} still to
          fix
        </div>
      ) : null}
    </section>
  );
}
