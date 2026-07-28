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
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";
import {
  clearSecondaryLocalActivitySession,
  finalizeSecondaryWordAsRevealed,
  recordSecondaryWordAttempt,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";
import type { SecondaryClozeTemplate } from "@/lib/secondary/types";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type ClozePracticeRunProps = {
  template: SecondaryClozeTemplate;
  onRequestRetry: () => void;
  studentId: string;
  dateKey: string;
  replayIndex: number;
  isReviewMode?: boolean;
  reviewSnapshot?: SecondaryActivityAttemptSnapshot | null;
};

function ClozePracticeRun({
  template,
  onRequestRetry,
  studentId,
  dateKey,
  replayIndex,
  isReviewMode = false,
  reviewSnapshot = null,
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

  return (
    <>
      <p className={secondaryUi.bodyMuted}>
        {isReviewMode && phase === "done"
          ? "Reviewing your last attempt."
          : phase === "done"
          ? "Here is how you did today."
          : phase === "repair"
            ? "Fix the blanks you missed. You have up to three tries per word."
            : `Practicing ${practicedWordIds.length} word${practicedWordIds.length === 1 ? "" : "s"} from today's list. Fill each blank from the word bank.`}
      </p>

      <article className="rounded-lg border border-sec-ink/20 bg-sec-panel p-4">
        <h3 className={secondaryUi.cardTitle}>{template.title}</h3>
        {template.topicTitle ? (
          <p className={`mt-1 ${secondaryUi.captionMuted}`}>
            {template.topicTitle} · {practicedWordIds.length} blank
            {practicedWordIds.length === 1 ? "" : "s"}
          </p>
        ) : null}
        <p className={`mt-2 ${secondaryUi.bodyLarge}`}>{template.paragraph}</p>
      </article>

      <div className="flex flex-wrap gap-2">
        {wordBank.map((word) => (
          <span
            key={word}
            className={secondaryUi.wordBankChip}
          >
            {word}
          </span>
        ))}
      </div>

      {phase === "done" ? <SecondaryActivitySummary activityLabel="Cloze" summary={scoreSummary} /> : null}

      <div className="space-y-3">
        {template.blankWordItemIds.map((wordItemId, index) => {
          if (!visibleBlankIds.includes(wordItemId)) return null;

          const outcome = outcomes[wordItemId];
          const pending = outcome?.kind === "pending" ? outcome : null;
          const isSuccess = outcome?.kind === "success";
          const isRevealed = outcome?.kind === "revealed";

          if (phase === "done" || isReviewMode) {
            return (
              <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={wordItemId}>
                <span className={secondaryUi.word}>Blank {index + 1}</span>
                <div
                  className={`rounded-lg border-2 px-3 py-2.5 ${secondaryUi.body} ${
                    isSuccess
                      ? "border-green-500 bg-green-50 text-green-900"
                      : "border-red-500 bg-red-50 text-red-900"
                  }`}
                >
                  {lockedAnswers[wordItemId] ?? getSecondaryVocabItemById(wordItemId)?.word}
                  {isSuccess && outcome.attemptsToSuccess > 1 ? (
                    <span className={`ml-2 ${secondaryUi.caption} font-bold text-green-800/80`}>
                      (try {outcome.attemptsToSuccess})
                    </span>
                  ) : null}
                  {isRevealed ? (
                    <span className={`ml-2 ${secondaryUi.caption} font-bold text-red-800/80`}>(needed help)</span>
                  ) : null}
                </div>
              </div>
            );
          }

          const showWrong = checked && pending && pending.wrongAttempts > 0 && !answers[index]?.trim();

          return (
            <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]" key={wordItemId}>
              <div>
                <label className={secondaryUi.word} htmlFor={`cloze-${wordItemId}`}>
                  Blank {index + 1}
                </label>
                {pending && pending.wrongAttempts > 0 ? (
                  <p className={`${secondaryUi.caption} text-red-800/80`}>
                    Attempt {pending.wrongAttempts + 1} of {SECONDARY_MAX_WRONG_ATTEMPTS}
                  </p>
                ) : null}
              </div>
              <input
                className={`${secondaryUi.inputField} ${
                  showWrong ? "border-red-500 bg-red-50" : ""
                }`}
                id={`cloze-${wordItemId}`}
                onChange={(event) => setBlankValue(index, event.target.value)}
                placeholder="Type the word"
                value={answers[index] ?? ""}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {phase !== "done" ? (
          <button
            className={secondaryUi.btnPrimary}
            disabled={!canCheck}
            onClick={handleCheckAnswers}
            type="button"
          >
            {phase === "repair" ? "Check repairs" : "Check answers"}
          </button>
        ) : null}
        <button className={secondaryUi.btnSecondary} onClick={onRequestRetry} type="button">
          Try again
        </button>
        <Link className={secondaryUi.btnSecondary} href="/secondary/learn">
          Back to Learn
        </Link>
      </div>

      {phase === "repair" && pendingWordIds.length > 0 ? (
        <div className={`rounded-lg border-2 border-amber-400 bg-amber-50 p-3 ${secondaryUi.body} font-bold text-amber-900`}>
          Keep going · {pendingWordIds.length} blank{pendingWordIds.length === 1 ? "" : "s"} still to
          fix
        </div>
      ) : null}
    </>
  );
}

export function ClozeActivity() {
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
      <section className="space-y-3 rounded-xl border-2 border-sec-ink bg-white p-5">
        <p className={secondaryUi.bodyMuted}>Loading today&apos;s practice...</p>
      </section>
    );
  }

  if (!template) {
    return (
      <section className="space-y-4 rounded-xl border-2 border-sec-ink bg-white p-5">
        <p className={secondaryUi.eyebrow}>Lower Secondary Activity</p>
        <h2 className={secondaryUi.pageTitle}>Cloze Paragraph</h2>
        <div className={`rounded-lg border-2 border-amber-400 bg-amber-50 p-3 ${secondaryUi.body} text-amber-900`}>
          Cloze needs at least two words from today&apos;s list with example sentences. Try Match or
          Spelling, or keep practicing to rotate new words onto your list.
        </div>
        <Link className={`inline-flex ${secondaryUi.btnSecondary}`} href="/secondary/learn">
          Back to Learn
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border-2 border-sec-ink bg-white p-5">
      <p className={secondaryUi.eyebrow}>Lower Secondary Activity</p>
      <h2 className={secondaryUi.pageTitle}>Cloze Paragraph</h2>
      <ClozePracticeRun
        key={`${template.id}:${runId}`}
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
