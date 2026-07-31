"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { readMasterySnapshot } from "@/lib/mastery/local-storage";
import { SecondaryActivitySummary } from "@/components/secondary/SecondaryActivitySummary";
import { compileSecondaryClozeFromWordIds } from "@/lib/secondary/secondary-cloze-compiler";
import { isSecondaryClozeAnswerCorrect } from "@/lib/secondary/secondary-activity-answers";
import {
  buildSecondaryDailyWordSetFingerprint,
  wordItemIdsFromSetKey,
} from "@/lib/secondary/secondary-activity-session-key";
import {
  clearSecondaryClozeReplayIndex,
  getSecondaryClozeReplayIndex,
  incrementSecondaryClozeReplayIndex,
} from "@/lib/secondary/secondary-cloze-replay-index";
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
import {
  buildFallbackActivityOutcomesFromLocal,
  clearSecondaryActivityAttemptSnapshot,
  getSecondaryActivityAttemptSnapshot,
  saveSecondaryActivityAttemptSnapshot,
  type SecondaryActivityAttemptSnapshot,
} from "@/lib/secondary/secondary-activity-attempt-snapshot";
import { useSecondaryActivityMode } from "@/lib/secondary/use-secondary-activity-mode";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { buildSecondaryClozeWordBank } from "@/lib/secondary/secondary-cloze-distractors";
import { buildClozeClause } from "@/lib/secondary/secondary-cloze-clause";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import {
  clearSecondaryLocalActivitySession,
  finalizeSecondaryWordAsRevealed,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";
import type { SecondaryClozeTemplate } from "@/lib/secondary/types";
import {
  secondaryActivityShell,
  secondaryActivityTitle,
  secondaryUi,
} from "@/lib/secondary/secondary-ui-typography";

type ClozePracticeRunProps = {
  template: SecondaryClozeTemplate;
  onRequestRetry: () => void;
  studentId: string;
  dateKey: string;
  replayIndex: number;
  isReviewMode?: boolean;
  reviewSnapshot?: SecondaryActivityAttemptSnapshot | null;
  compact?: boolean;
};

function ClozePracticeRun({
  template,
  onRequestRetry,
  studentId,
  dateKey,
  replayIndex,
  isReviewMode = false,
  reviewSnapshot = null,
  compact = false,
}: ClozePracticeRunProps) {
  const [answers, setAnswers] = useState(() => template.blankWordItemIds.map(() => ""));
  const [lockedAnswers, setLockedAnswers] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, SecondaryWordOutcome>>(() =>
    createPendingOutcomes(template.blankWordItemIds),
  );
  const [phase, setPhase] = useState<"practice" | "repair" | "done">("practice");
  const [checked, setChecked] = useState(false);
  const initRef = useRef(false);

  const practicedWordIds = template.blankWordItemIds;

  const pendingWordIds = useMemo(
    () => getSecondaryPendingWordIds(outcomes, practicedWordIds),
    [outcomes, practicedWordIds],
  );

  const visibleBlankIds = useMemo(() => {
    if (phase === "repair") return pendingWordIds;
    return template.blankWordItemIds;
  }, [template.blankWordItemIds, phase, pendingWordIds]);

  const [wordBank] = useState(() =>
    buildSecondaryClozeWordBank({
      blankWordItemIds: template.blankWordItemIds,
      distractorWords: template.distractorWords,
      seed: template.id,
    }),
  );

  const scoreSummary = useMemo(
    () => buildSecondaryActivityScoreSummary(outcomes, practicedWordIds),
    [outcomes, practicedWordIds],
  );

  function persistClozeSnapshot(
    nextOutcomes: Record<string, SecondaryWordOutcome>,
    nextLocked: Record<string, string>,
    percent: number,
    completedAt: string,
  ) {
    if (!studentId || !dateKey || practicedWordIds.length === 0) return;

    saveSecondaryActivityAttemptSnapshot({
      version: 1,
      activityKey: "cloze",
      studentId,
      dateKey,
      completedAt,
      percent,
      wordItemIds: practicedWordIds,
      outcomes: nextOutcomes,
      cloze: {
        templateId: template.id,
        replayIndex,
        lockedAnswers: nextLocked,
      },
    });
  }

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (
      reviewSnapshot &&
      reviewSnapshot.cloze?.templateId === template.id &&
      (isReviewMode || getSecondaryTodayCompletion(new Date()).cloze?.completed)
    ) {
      setOutcomes(reviewSnapshot.outcomes);
      setLockedAnswers(reviewSnapshot.cloze.lockedAnswers);
      setAnswers(
        template.blankWordItemIds.map(
          (wordItemId) => reviewSnapshot.cloze?.lockedAnswers[wordItemId] ?? "",
        ),
      );
      setPhase("done");
      setChecked(false);
      return;
    }

    if (isReviewMode) {
      const fallbackOutcomes = buildFallbackActivityOutcomesFromLocal(
        "cloze",
        studentId,
        dateKey,
        practicedWordIds,
      );
      if (fallbackOutcomes) {
        const locked = Object.fromEntries(
          practicedWordIds.map((wordItemId) => [
            wordItemId,
            getSecondaryVocabItemById(wordItemId)?.word ?? "",
          ]),
        );
        setOutcomes(fallbackOutcomes);
        setLockedAnswers(locked);
        setAnswers(practicedWordIds.map((wordItemId) => locked[wordItemId] ?? ""));
        setPhase("done");
        setChecked(false);
      }
    }
  }, [
    reviewSnapshot,
    template.id,
    template.blankWordItemIds,
    isReviewMode,
    studentId,
    dateKey,
    practicedWordIds,
  ]);

  function setBlankValue(index: number, value: string) {
    const wordItemId = template.blankWordItemIds[index];
    if (!practicedWordIds.includes(wordItemId) || isSecondaryWordOutcomeDone(outcomes[wordItemId])) {
      return;
    }
    setAnswers((current) =>
      current.map((entry, currentIndex) => (currentIndex === index ? value : entry)),
    );
    setChecked(false);
  }

  function handleCheckAnswers() {
    const now = new Date();
    const idsToCheck = phase === "repair" ? pendingWordIds : practicedWordIds;
    const nextOutcomes = { ...outcomes };
    const nextLocked = { ...lockedAnswers };
    const nextAnswers = [...answers];

    for (const wordItemId of idsToCheck) {
      const index = template.blankWordItemIds.indexOf(wordItemId);
      if (index < 0) continue;
      const outcome = nextOutcomes[wordItemId];
      if (!outcome || outcome.kind !== "pending") continue;

      const expected = getSecondaryVocabItemById(wordItemId)?.word ?? "";
      const isCorrect = isSecondaryClozeAnswerCorrect(wordItemId, answers[index]);
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
      persistClozeSnapshot(
        nextOutcomes,
        nextLocked,
        summary.percentUnderstood,
        now.toISOString(),
      );
      setPhase("done");
      return;
    }

    setPhase("repair");
  }

  const canCheck =
    !isReviewMode &&
    phase !== "done" &&
    visibleBlankIds.every((wordItemId) => {
      const index = template.blankWordItemIds.indexOf(wordItemId);
      return index >= 0 && Boolean(answers[index]?.trim());
    });

  const sentenceCards = useMemo(
    () =>
      template.blankWordItemIds.map((wordItemId, index) => {
        const item = getSecondaryVocabItemById(wordItemId);
        const clause = item ? buildClozeClause(item) : "____";
        const parts = clause.split("____");
        return { wordItemId, index, parts };
      }),
    [template.blankWordItemIds],
  );

  const clozeContentWidth = compact
    ? "mx-auto w-full max-w-3xl px-2 sm:max-w-4xl sm:px-4"
    : "w-full";

  function fillBlankFromWordBank(word: string) {
    if (phase === "done" || isReviewMode) return;
    const targetId =
      visibleBlankIds.find((wordItemId) => {
        const index = template.blankWordItemIds.indexOf(wordItemId);
        return index >= 0 && !answers[index]?.trim();
      }) ?? visibleBlankIds[0];
    if (!targetId) return;
    const index = template.blankWordItemIds.indexOf(targetId);
    if (index < 0) return;
    setBlankValue(index, word);
  }

  function renderInlineBlank(wordItemId: string, index: number) {
    const outcome = outcomes[wordItemId];
    const pending = outcome?.kind === "pending" ? outcome : null;
    const isSuccess = outcome?.kind === "success";
    const isRevealed = outcome?.kind === "revealed";
    const expected = getSecondaryVocabItemById(wordItemId)?.word ?? "";
    const inputCh = Math.max(7, Math.min(18, expected.length + 2));
    const locked = lockedAnswers[wordItemId] ?? expected;
    const isEditable =
      !isReviewMode &&
      phase !== "done" &&
      visibleBlankIds.includes(wordItemId) &&
      !isSecondaryWordOutcomeDone(outcome);
    const showWrong =
      checked && pending && pending.wrongAttempts > 0 && !answers[index]?.trim();

    if (!isEditable) {
      const showResult = phase === "done" || isReviewMode || isSuccess || isRevealed;
      return (
        <span
          className={`mx-0.5 inline-flex min-w-[4.5rem] items-baseline justify-center rounded-md border-2 px-1.5 py-0.5 align-baseline text-[1.05em] font-extrabold ${
            showResult
              ? isSuccess
                ? "border-green-500 bg-green-50 text-green-900"
                : isRevealed
                  ? "border-red-500 bg-red-50 text-red-900"
                  : "border-sec-border bg-white text-sec-ink"
              : "border-sec-border bg-white text-sec-ink"
          }`}
        >
          {locked || "____"}
          {showResult && isSuccess && outcome.attemptsToSuccess > 1 ? (
            <span className="ml-1 text-[0.7em] font-bold text-green-800/80">
              (try {outcome.attemptsToSuccess})
            </span>
          ) : null}
          {showResult && isRevealed ? (
            <span className="ml-1 text-[0.7em] font-bold text-red-800/80">(help)</span>
          ) : null}
        </span>
      );
    }

    return (
      <input
        aria-label={`Blank ${index + 1}`}
        className={`mx-0.5 inline-block rounded-md border-2 bg-white px-1.5 py-0.5 align-baseline text-center text-[1.05em] font-extrabold text-sec-ink outline-none focus:border-sec-accent focus:ring-2 focus:ring-sec-accent/25 ${
          showWrong ? "border-red-500 bg-red-50" : "border-sec-ink/40"
        }`}
        id={`cloze-${wordItemId}`}
        onChange={(event) => setBlankValue(index, event.target.value)}
        placeholder="…"
        style={{ width: `${inputCh}ch` }}
        value={answers[index] ?? ""}
      />
    );
  }

  return (
    <div className={`${clozeContentWidth} space-y-4`}>
      {!compact ? (
        <p className={secondaryUi.bodyMuted}>
          {isReviewMode && phase === "done"
            ? "Reviewing your last attempt."
            : phase === "done"
            ? "Here is how you did today."
            : phase === "repair"
              ? "Fix the blanks you missed. You have up to three tries per word."
              : `Practicing ${practicedWordIds.length} word${practicedWordIds.length === 1 ? "" : "s"} from today's list. Fill each blank from the word bank.`}
        </p>
      ) : null}

      <div className="space-y-3">
        <h3 className={`${secondaryUi.cardTitle} sm:text-xl`}>Fill in the blanks</h3>
        {sentenceCards.map(({ wordItemId, index, parts }) => (
          <article
            key={wordItemId}
            className="rounded-xl border border-sec-border bg-sec-panel-muted px-4 py-3 shadow-sm sm:px-5 sm:py-4"
          >
            <p className="text-lg font-semibold leading-relaxed text-sec-ink sm:text-xl sm:leading-relaxed">
              {parts.map((part, partIndex) => (
                <span key={`${wordItemId}-part-${partIndex}`}>
                  {part}
                  {partIndex < parts.length - 1
                    ? renderInlineBlank(wordItemId, index)
                    : null}
                </span>
              ))}
            </p>
          </article>
        ))}
        {phase === "repair" && pendingWordIds.length > 0 ? (
          <p className={`${secondaryUi.caption} font-bold text-amber-900`}>
            Fix the open blanks · {pendingWordIds.length} still to go
          </p>
        ) : null}
      </div>

      {phase !== "done" && !isReviewMode ? (
        <div className="flex flex-wrap justify-center gap-2">
          {wordBank.map((word) => (
            <button
              key={word}
              className={`${secondaryUi.wordBankChip} cursor-pointer transition hover:border-sec-accent hover:bg-sec-accent-soft`}
              onClick={() => fillBlankFromWordBank(word)}
              type="button"
            >
              {word}
            </button>
          ))}
        </div>
      ) : null}

      {phase === "done" ? <SecondaryActivitySummary activityLabel="Cloze" summary={scoreSummary} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        {phase !== "done" ? (
          <button
            className={compact ? secondaryUi.btnPrimaryCompact : secondaryUi.btnPrimary}
            disabled={!canCheck}
            onClick={handleCheckAnswers}
            type="button"
          >
            {phase === "repair" ? "Check repairs" : "Check answers"}
          </button>
        ) : null}
        <button
          className={compact ? secondaryUi.btnSecondaryCompact : secondaryUi.btnSecondary}
          onClick={onRequestRetry}
          type="button"
        >
          Try again
        </button>
        {!compact ? (
          <Link className={secondaryUi.btnSecondary} href="/secondary/learn">
            Back to Learn
          </Link>
        ) : null}
      </div>
    </div>
  );
}

type ClozeActivityProps = {
  compact?: boolean;
};

export function ClozeActivity({ compact = false }: ClozeActivityProps) {
  const { todaySession } = useSecondaryTodaySession();
  const { isReviewMode, isRetry } = useSecondaryActivityMode();
  const studentId = resolveSecondaryStudentId();
  const retryHandledRef = useRef(false);

  const clozeDateKey = todaySession?.dateKey ?? "";
  const clozeWordSetKey = todaySession?.allWordItemIds.join(",") ?? "";
  const clozeWordItemIds = useMemo(
    () => wordItemIdsFromSetKey(clozeWordSetKey),
    [clozeWordSetKey],
  );
  const clozeSessionFingerprint = buildSecondaryDailyWordSetFingerprint(
    clozeDateKey,
    clozeWordItemIds,
    "cloze",
  );

  const [replayIndex, setReplayIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const previousSessionFingerprintRef = useRef<string | null>(null);
  const replayHydratedRef = useRef(false);

  const reviewSnapshot = useMemo(() => {
    if (!studentId || !clozeDateKey) return null;
    return getSecondaryActivityAttemptSnapshot("cloze", studentId, clozeDateKey);
  }, [studentId, clozeDateKey, runId]);

  useEffect(() => {
    if (isReviewMode && reviewSnapshot?.cloze) {
      setReplayIndex(reviewSnapshot.cloze.replayIndex);
    }
  }, [isReviewMode, reviewSnapshot]);

  useEffect(() => {
    if (!clozeSessionFingerprint || !studentId || !clozeDateKey) return;

    if (previousSessionFingerprintRef.current !== clozeSessionFingerprint) {
      clearSecondaryClozeReplayIndex(studentId, clozeDateKey);
      setReplayIndex(0);
      setRunId((current) => current + 1);
      previousSessionFingerprintRef.current = clozeSessionFingerprint;
      replayHydratedRef.current = false;
      return;
    }

    if (!replayHydratedRef.current) {
      setReplayIndex(getSecondaryClozeReplayIndex(studentId, clozeDateKey));
      replayHydratedRef.current = true;
    }
  }, [clozeSessionFingerprint, studentId, clozeDateKey]);

  const template = useMemo((): SecondaryClozeTemplate | null => {
    if (!clozeSessionFingerprint || !clozeDateKey || clozeWordItemIds.length === 0) return null;
    return compileSecondaryClozeFromWordIds({
      wordItemIds: clozeWordItemIds,
      masteryRecords: readMasterySnapshot().records,
      studentId,
      dateKey: clozeDateKey,
      replayIndex,
    });
  }, [clozeSessionFingerprint, clozeDateKey, clozeWordItemIds, studentId, replayIndex]);

  function handleRetry() {
    const now = new Date();
    clearSecondaryLocalActivitySession("cloze", now);
    clearSecondaryTodayActivityCompletion("cloze", now);
    if (studentId && clozeDateKey) {
      clearSecondaryActivityAttemptSnapshot("cloze", studentId, clozeDateKey);
    }

    const nextReplayIndex = incrementSecondaryClozeReplayIndex(studentId, clozeDateKey);
    setReplayIndex(nextReplayIndex);
    setRunId((current) => current + 1);
  }

  useEffect(() => {
    if (!isRetry || retryHandledRef.current || !clozeDateKey) return;
    retryHandledRef.current = true;
    handleRetry();
  }, [isRetry, clozeDateKey]);

  if (!todaySession) {
    return (
      <section className={secondaryActivityShell(compact)}>
        <p className={secondaryUi.bodyMuted}>Loading today&apos;s practice...</p>
      </section>
    );
  }

  if (!template) {
    return (
      <section className={secondaryActivityShell(compact)}>
        {!compact ? <p className={secondaryUi.eyebrow}>Lower Secondary Activity</p> : null}
        <h2 className={secondaryActivityTitle(compact)}>Fill in the blanks</h2>
        <div className={`rounded-lg border-2 border-amber-400 bg-amber-50 p-3 ${secondaryUi.body} text-amber-900`}>
          Cloze needs at least two words from today&apos;s list with example sentences. Try Match or
          Spelling, or keep practicing to rotate new words onto your list.
        </div>
        {!compact ? (
          <Link className={`inline-flex ${secondaryUi.btnSecondary}`} href="/secondary/learn">
            Back to Learn
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className={secondaryActivityShell(compact)}>
      {!compact ? <p className={secondaryUi.eyebrow}>Lower Secondary Activity</p> : null}
      {!compact ? (
        <h2 className={secondaryActivityTitle(compact)}>Fill in the blanks</h2>
      ) : null}
      <ClozePracticeRun
        key={`${template.id}:${runId}`}
        compact={compact}
        dateKey={clozeDateKey}
        isReviewMode={isReviewMode}
        onRequestRetry={handleRetry}
        replayIndex={replayIndex}
        reviewSnapshot={reviewSnapshot}
        studentId={studentId}
        template={template}
      />
    </section>
  );
}
