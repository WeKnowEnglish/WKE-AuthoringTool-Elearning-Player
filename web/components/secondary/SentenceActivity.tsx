"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  submitSecondarySentenceSubmission,
  resubmitSecondarySentenceSubmission,
  getMySentenceSubmissionsForDate,
} from "@/lib/actions/student-sentence";
import type { StudentSentenceSubmissionView } from "@/lib/actions/student-sentence";
import { SecondaryActivitySummary } from "@/components/secondary/SecondaryActivitySummary";
import {
  buildSecondaryDailyWordSetFingerprint,
  wordItemIdsFromSetKey,
} from "@/lib/secondary/secondary-activity-session-key";
import { buildSecondarySentencePrompt } from "@/lib/secondary/secondary-sentence-prompt";
import { validateSecondarySentenceQuality } from "@/lib/secondary/secondary-sentence-quality-check";
import {
  canResubmitSentenceSubmission,
  countSentenceSubmissionsNeedingResubmit,
  pickLatestSentenceSubmissionByWordId,
} from "@/lib/secondary/secondary-sentence-submissions";
import {
  buildSecondaryActivityScoreSummary,
  getSecondaryPendingWordIds,
} from "@/lib/secondary/secondary-scaffold";
import {
  clearSecondaryTodayActivityCompletion,
  getSecondaryTodayCompletion,
  setSecondaryTodayActivityCompletion,
} from "@/lib/secondary/secondary-today-session";
import { useSecondaryTodaySession } from "@/lib/secondary/use-secondary-today-session";
import { useSecondaryActivityResetGuard } from "@/lib/secondary/use-secondary-activity-reset-guard";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import {
  resolveSecondarySentenceWordRun,
  SECONDARY_SENTENCE_WORDS_PER_SESSION,
} from "@/lib/secondary/secondary-sentence-word-set";
import { getSecondaryVocabItemsByIds } from "@/lib/secondary/secondary-vocab-bank";
import {
  buildSecondarySentenceOutcomesFromLocal,
  clearSecondaryLocalActivitySession,
  recordSecondarySentenceSubmittedLocal,
} from "@/lib/secondary/secondary-word-progress";
import type { SecondaryWordOutcome } from "@/lib/secondary/secondary-scaffold";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

function studentSentenceStatusLabel(
  status: StudentSentenceSubmissionView["status"] | undefined,
): { label: string; className: string } {
  switch (status) {
    case "submitted":
      return {
        label: "Waiting for teacher review",
        className: "border-sky-500 bg-sky-50 text-sky-950",
      };
    case "approved":
      return {
        label: "Approved by teacher",
        className: "border-emerald-500 bg-emerald-50 text-emerald-950",
      };
    case "needs_revision":
      return {
        label: "Needs revision",
        className: "border-amber-500 bg-amber-50 text-amber-950",
      };
    default:
      return {
        label: "Not submitted",
        className: "border-kid-ink/25 bg-kid-panel/40 text-kid-ink/80",
      };
  }
}

const SENTENCE_QUALITY_HINT =
  "Use the word, start with a capital letter, and end with . ? or ! Your teacher will review your writing — this is not a grammar checker.";

export function SentenceActivity() {
  const { todaySession } = useSecondaryTodaySession();
  const studentId = resolveSecondaryStudentId();
  const { shouldSkipInit, noteInitialized, markFinished, clearFinished } =
    useSecondaryActivityResetGuard();
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [wordSetReady, setWordSetReady] = useState(false);
  const [runEpoch, setRunEpoch] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [outcomes, setOutcomes] = useState<Record<string, SecondaryWordOutcome>>({});
  const [feedback, setFeedback] = useState<"submitted" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submissionViews, setSubmissionViews] = useState<StudentSentenceSubmissionView[]>([]);
  const [resubmitWordId, setResubmitWordId] = useState<string | null>(null);
  const [resubmitValue, setResubmitValue] = useState("");
  const [isResubmitting, setIsResubmitting] = useState(false);
  const outcomesRef = useRef(outcomes);
  outcomesRef.current = outcomes;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sentenceDateKey = todaySession?.dateKey ?? "";
  const sentenceWordSetKey = selectedWordIds.join(",");

  const sentenceWordIds = selectedWordIds;

  useEffect(() => {
    if (!sentenceDateKey) return;
    const run = resolveSecondarySentenceWordRun({
      studentId,
      dateKey: sentenceDateKey,
      forceNewRun: false,
    });
    setSelectedWordIds(run.wordItemIds);
    setWordSetReady(true);
  }, [sentenceDateKey, studentId, runEpoch]);

  const sentenceActivityFingerprint = buildSecondaryDailyWordSetFingerprint(
    sentenceDateKey,
    sentenceWordIds,
    "sentence",
  );

  const requiredWordIdsKey = sentenceWordIds.join(",");

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
  const currentPrompt = currentItem ? buildSecondarySentencePrompt(currentItem) : null;

  const scoreSummary = useMemo(
    () => buildSecondaryActivityScoreSummary(outcomes, requiredWordIds),
    [outcomes, requiredWordIds],
  );

  async function refreshSubmissionViews() {
    if (!sentenceDateKey) return;
    const rows = await getMySentenceSubmissionsForDate(sentenceDateKey);
    setSubmissionViews(rows);
  }

  useEffect(() => {
    if (!sentenceDateKey) return;

    let cancelled = false;
    void getMySentenceSubmissionsForDate(sentenceDateKey).then((rows) => {
      if (!cancelled) setSubmissionViews(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [sentenceDateKey]);

  const submissionByWordId = useMemo(
    () => pickLatestSentenceSubmissionByWordId(submissionViews),
    [submissionViews],
  );

  const revisionsNeededCount = useMemo(
    () => countSentenceSubmissionsNeedingResubmit(submissionViews),
    [submissionViews],
  );

  useEffect(() => {
    if (!wordSetReady || !sentenceActivityFingerprint || !requiredWordIdsKey) return;
    if (shouldSkipInit(sentenceActivityFingerprint)) return;

    const ids = wordItemIdsFromSetKey(requiredWordIdsKey);
    const saved = getSecondaryTodayCompletion(new Date()).sentence;
    const restoredOutcomes = buildSecondarySentenceOutcomesFromLocal(ids);

    if (saved?.completed) {
      markFinished();
      noteInitialized(sentenceActivityFingerprint);
      setQueue([]);
      setValue("");
      setOutcomes(restoredOutcomes);
      setFeedback(null);
      setErrorMessage(null);
      setIsComplete(true);
      return;
    }

    const stillPending = getSecondaryPendingWordIds(restoredOutcomes, ids);
    noteInitialized(sentenceActivityFingerprint);
    setQueue(stillPending.length > 0 ? [...stillPending] : [...ids]);
    setValue("");
    setOutcomes(restoredOutcomes);
    setFeedback(null);
    setErrorMessage(null);
    setIsComplete(stillPending.length === 0 && ids.length > 0);
  }, [
    shouldSkipInit,
    noteInitialized,
    markFinished,
    sentenceActivityFingerprint,
    requiredWordIdsKey,
    wordSetReady,
  ]);

  useEffect(() => {
    if (isComplete || feedback !== null || !currentItem) return;
    textareaRef.current?.focus();
  }, [currentWordItemId, isComplete, feedback, currentItem]);

  function advanceQueue(nextOutcomes: Record<string, SecondaryWordOutcome>) {
    const now = new Date();
    const stillPending = getSecondaryPendingWordIds(nextOutcomes, requiredWordIds);
    if (stillPending.length === 0) {
      const summary = buildSecondaryActivityScoreSummary(nextOutcomes, requiredWordIds);
      markFinished();
      setSecondaryTodayActivityCompletion(
        "sentence",
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

    setQueue([...stillPending]);
    setValue("");
    setFeedback(null);
    setErrorMessage(null);
  }

  async function handleSubmitSentence() {
    if (isComplete || !currentItem || !currentWordItemId || isSubmitting) return;
    if (!value.trim()) return;

    const quality = validateSecondarySentenceQuality({
      text: value,
      targetWord: currentItem.word,
      lemma: currentItem.lemma,
      partOfSpeech: currentItem.partOfSpeech,
    });
    if (!quality.ok) {
      setFeedback("error");
      setErrorMessage(quality.message);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const now = new Date();
    const attemptedAt = now.toISOString();
    const result = await submitSecondarySentenceSubmission({
      wordItemId: currentItem.wordItemId,
      sentenceText: value,
      dateKey: sentenceDateKey,
      sessionWordSetHash: sentenceWordSetKey || null,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setFeedback("error");
      setErrorMessage(result.error);
      return;
    }

    recordSecondarySentenceSubmittedLocal(currentItem.wordItemId, attemptedAt);

    const nextOutcomes = {
      ...outcomes,
      [currentWordItemId]: { kind: "submitted" as const },
    };
    setOutcomes(nextOutcomes);
    setFeedback("submitted");

    window.setTimeout(() => {
      advanceQueue(nextOutcomes);
    }, 700);
  }

  async function handleResubmitSentence(wordItemId: string) {
    if (!resubmitValue.trim() || isResubmitting) return;

    const item = promptById.get(wordItemId);
    if (!item) return;

    const quality = validateSecondarySentenceQuality({
      text: resubmitValue,
      targetWord: item.word,
      lemma: item.lemma,
      partOfSpeech: item.partOfSpeech,
    });
    if (!quality.ok) {
      setFeedback("error");
      setErrorMessage(quality.message);
      return;
    }

    setIsResubmitting(true);
    setErrorMessage(null);

    const now = new Date();
    const result = await resubmitSecondarySentenceSubmission({
      wordItemId,
      sentenceText: resubmitValue,
      dateKey: sentenceDateKey,
      sessionWordSetHash: sentenceWordSetKey || null,
    });

    setIsResubmitting(false);

    if (!result.ok) {
      setFeedback("error");
      setErrorMessage(result.error);
      return;
    }

    recordSecondarySentenceSubmittedLocal(wordItemId, now.toISOString());
    await refreshSubmissionViews();
    setResubmitWordId(null);
    setResubmitValue("");
    setFeedback("submitted");
    window.setTimeout(() => setFeedback(null), 700);
  }

  function handleRetry() {
    const now = new Date();
    const run = resolveSecondarySentenceWordRun({
      studentId,
      dateKey: sentenceDateKey,
      forceNewRun: true,
    });
    clearFinished();
    clearSecondaryLocalActivitySession("sentence", now);
    clearSecondaryTodayActivityCompletion("sentence", now);
    setSelectedWordIds(run.wordItemIds);
    setRunEpoch((current) => current + 1);
    setQueue([...run.wordItemIds]);
    setValue("");
    setOutcomes(
      Object.fromEntries(
        run.wordItemIds.map((wordItemId) => [
          wordItemId,
          { kind: "pending" as const, wrongAttempts: 0 },
        ]),
      ),
    );
    setFeedback(null);
    setErrorMessage(null);
    setIsComplete(false);
    setResubmitWordId(null);
    setResubmitValue("");
    const nextFingerprint = buildSecondaryDailyWordSetFingerprint(
      sentenceDateKey,
      run.wordItemIds,
      "sentence",
    );
    if (nextFingerprint) {
      noteInitialized(nextFingerprint);
    }
  }

  if (!todaySession || !wordSetReady) {
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
        <h2 className="text-2xl font-extrabold text-kid-ink">Write a Sentence</h2>
        <p className="text-sm font-semibold text-kid-ink/80">
          No sentence prompts are available in the vocabulary list yet.
        </p>
        <Link
          className="inline-flex rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-extrabold text-kid-ink"
          href="/secondary"
        >
          Back to vocabulary home
        </Link>
      </section>
    );
  }

  const queuePosition = Math.max(
    1,
    requiredWordIds.length - getSecondaryPendingWordIds(outcomes, requiredWordIds).length + 1,
  );

  return (
    <section className="space-y-4 rounded-xl border-2 border-kid-ink bg-white p-5">
      <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        Lower Secondary Activity
      </p>
      <h2 className="text-2xl font-extrabold text-kid-ink">Write a Sentence</h2>
      <p className="text-sm font-semibold text-kid-ink/80">
        {isComplete
          ? revisionsNeededCount > 0
            ? "Your teacher asked you to revise some sentences below."
            : "Your sentences were sent to your teacher for review."
          : `Use each word in your own sentence (${SECONDARY_SENTENCE_WORDS_PER_SESSION} words per round). Your teacher will review your writing.`}
      </p>

      {isComplete ? (
        <>
          <SecondaryActivitySummary activityLabel="Sentences" summary={scoreSummary} />
          <div className="space-y-2">
            {requiredWordIds.map((wordItemId) => {
              const item = promptById.get(wordItemId);
              const outcome = outcomes[wordItemId];
              const submission = submissionByWordId.get(wordItemId);
              const status = studentSentenceStatusLabel(
                submission?.status ?? (outcome?.kind === "submitted" ? "submitted" : undefined),
              );
              const isResubmittingThis = resubmitWordId === wordItemId;
              const canResubmit = canResubmitSentenceSubmission(submission?.status);
              const prompt = item ? buildSecondarySentencePrompt(item) : null;

              return (
                <div
                  key={wordItemId}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${status.className}`}
                >
                  <span className="font-extrabold">{item?.word}</span>
                  <span className="ml-2 text-xs font-bold opacity-80">({status.label})</span>
                  {submission?.status === "needs_revision" && submission.teacherComment ? (
                    <p className="mt-1 text-xs font-semibold">
                      Teacher note: {submission.teacherComment}
                    </p>
                  ) : null}
                  {submission?.sentenceText && submission.status !== "needs_revision" ? (
                    <p className="mt-1 text-xs font-semibold opacity-80">
                      Your sentence: {submission.sentenceText}
                    </p>
                  ) : null}
                  {canResubmit && !isResubmittingThis ? (
                    <button
                      className="mt-2 rounded-lg border-2 border-amber-700 bg-white px-3 py-1.5 text-xs font-extrabold text-amber-950"
                      onClick={() => {
                        setResubmitWordId(wordItemId);
                        setResubmitValue("");
                        setErrorMessage(null);
                        setFeedback(null);
                      }}
                      type="button"
                    >
                      Try again
                    </button>
                  ) : null}
                  {isResubmittingThis && prompt ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs font-semibold">{prompt.instruction}</p>
                      <textarea
                        className="min-h-[5rem] w-full rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-semibold text-kid-ink disabled:opacity-60"
                        disabled={isResubmitting}
                        onChange={(event) => setResubmitValue(event.target.value)}
                        placeholder={`Write a revised sentence with "${prompt.targetWord}"…`}
                        value={resubmitValue}
                      />
                      <p className="text-xs font-semibold text-kid-ink/65">{SENTENCE_QUALITY_HINT}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-1.5 text-xs font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!resubmitValue.trim() || isResubmitting}
                          onClick={() => void handleResubmitSentence(wordItemId)}
                          type="button"
                        >
                          {isResubmitting ? "Sending…" : "Send revised sentence"}
                        </button>
                        <button
                          className="rounded-lg border-2 border-kid-ink bg-white px-3 py-1.5 text-xs font-extrabold text-kid-ink"
                          disabled={isResubmitting}
                          onClick={() => {
                            setResubmitWordId(null);
                            setResubmitValue("");
                            setErrorMessage(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {feedback === "submitted" ? (
            <p className="rounded-md border border-sky-300 bg-sky-50 p-2 text-sm font-bold text-sky-950" role="status">
              Revised sentence sent to your teacher!
            </p>
          ) : null}
          {feedback === "error" && errorMessage ? (
            <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm font-bold text-red-900" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </>
      ) : currentItem && currentPrompt ? (
        <div className="space-y-3 rounded-lg border border-kid-ink/20 bg-kid-panel p-4">
          <p className="text-xs font-extrabold text-kid-ink/70">
            Word {Math.min(queuePosition, requiredWordIds.length)} of {requiredWordIds.length}
          </p>
          <p className="text-sm font-semibold leading-relaxed text-kid-ink">
            {currentPrompt.instruction}
          </p>
          {currentPrompt.frameHint ? (
            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950">
              Frame hint: <span className="font-extrabold">{currentPrompt.frameHint}</span>
            </p>
          ) : null}
          {currentItem.exampleSentence ? (
            <p className="text-xs font-bold text-kid-ink/70">
              Example: {currentItem.exampleSentence}
            </p>
          ) : null}
          <textarea
            ref={textareaRef}
            className="min-h-[6rem] w-full rounded-lg border-2 border-kid-ink bg-white px-3 py-2 text-sm font-semibold text-kid-ink disabled:opacity-60"
            disabled={isSubmitting || feedback === "submitted"}
            onChange={(event) => setValue(event.target.value)}
            placeholder={`Write a sentence with "${currentPrompt.targetWord}"…`}
            value={value}
          />
          <p className="text-xs font-semibold text-kid-ink/65">{SENTENCE_QUALITY_HINT}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-lg border-2 border-kid-ink bg-kid-accent px-3 py-2 text-sm font-extrabold text-kid-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!value.trim() || isSubmitting || feedback === "submitted"}
              onClick={() => void handleSubmitSentence()}
              type="button"
            >
              {isSubmitting ? "Sending…" : "Send to teacher"}
            </button>
          </div>
          {feedback === "submitted" ? (
            <p className="rounded-md border border-sky-300 bg-sky-50 p-2 text-sm font-bold text-sky-950" role="status">
              Sent to your teacher!
            </p>
          ) : null}
          {feedback === "error" && errorMessage ? (
            <p className="rounded-md border border-red-300 bg-red-50 p-2 text-sm font-bold text-red-900" role="alert">
              {errorMessage}
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
          New words
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
