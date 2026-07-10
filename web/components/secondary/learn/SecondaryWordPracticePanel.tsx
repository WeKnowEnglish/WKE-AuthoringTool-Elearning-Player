"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { flushMasterySyncQueueForCurrentStudent } from "@/lib/mastery/supabase-sync";
import { notifySecondarySessionChanged } from "@/lib/secondary/secondary-session-events";
import {
  compileSecondaryLearnQuestions,
  type SecondaryLearnQuestion,
} from "@/lib/secondary/secondary-learn-practice";
import { SECONDARY_MAX_WRONG_ATTEMPTS } from "@/lib/secondary/secondary-scaffold";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import { recordSecondaryLearnWordAttempt } from "@/lib/secondary/secondary-word-progress";
import type { SecondaryVocabItem } from "@/lib/secondary/types";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type Props = {
  item: SecondaryVocabItem;
  sessionWordItemIds: string[];
  dateKey: string;
  onClose: () => void;
  centered?: boolean;
};

type QuestionResult = {
  questionId: string;
  correct: boolean;
};

type FeedbackState = {
  kind: "correct" | "wrong" | "revealed";
  message: string;
};

function buildQuestions(
  item: SecondaryVocabItem,
  sessionWordItemIds: string[],
  dateKey: string,
  runSeed: string,
): SecondaryLearnQuestion[] {
  return compileSecondaryLearnQuestions({
    item,
    sessionWordItemIds,
    studentId: resolveSecondaryStudentId(),
    dateKey,
    runSeed,
  });
}

export function SecondaryWordPracticePanel({
  item,
  sessionWordItemIds,
  dateKey,
  onClose,
  centered = false,
}: Props) {
  const [runSeed, setRunSeed] = useState("0");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  const questions = useMemo(
    () => buildQuestions(item, sessionWordItemIds, dateKey, runSeed),
    [item, sessionWordItemIds, dateKey, runSeed],
  );

  const currentQuestion = questions[questionIndex] ?? null;
  const isComplete = questionIndex >= questions.length;
  const correctCount = results.filter((result) => result.correct).length;

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

  function recordAttempt(isCorrect: boolean, attemptNumber: number, firstTry: boolean) {
    recordSecondaryLearnWordAttempt(
      {
        wordItemId: item.wordItemId,
        isCorrect,
        attemptedAt: new Date().toISOString(),
      },
      {
        firstTry: firstTry && isCorrect,
        attempts: attemptNumber,
      },
    );
  }

  function finishRun(nextResults: QuestionResult[]) {
    notifySecondarySessionChanged();
    void flushMasterySyncQueueForCurrentStudent();
    setResults(nextResults);
    setQuestionIndex(questions.length);
    setFeedback(null);
    setSelectedChoiceId(null);
  }

  const advanceQuestion = useCallback(
    (wasCorrect: boolean) => {
      if (!currentQuestion) return;

      const nextResults = [
        ...results,
        { questionId: currentQuestion.id, correct: wasCorrect },
      ];

      if (questionIndex + 1 >= questions.length) {
        finishRun(nextResults);
        return;
      }

      setResults(nextResults);
      setQuestionIndex((index) => index + 1);
      setWrongAttempts(0);
      setFeedback(null);
      setSelectedChoiceId(null);
    },
    [currentQuestion, questionIndex, questions.length, results],
  );

  const handleChoice = useCallback(
    (choiceId: string) => {
      if (!currentQuestion) return;
      if (feedback?.kind === "correct" || feedback?.kind === "revealed") return;

      const choice = currentQuestion.choices.find((entry) => entry.id === choiceId);
      if (!choice) return;

      setSelectedChoiceId(choiceId);
      const attemptNumber = wrongAttempts + 1;

      if (choice.isCorrect) {
        recordAttempt(true, attemptNumber, wrongAttempts === 0);
        setFeedback({
          kind: "correct",
          message: `Nice! “${item.word}” means ${item.studentMeaningEn}`,
        });
        clearAdvanceTimer();
        advanceTimerRef.current = window.setTimeout(() => advanceQuestion(true), 900);
        return;
      }

      const nextWrong = wrongAttempts + 1;
      setWrongAttempts(nextWrong);

      if (nextWrong >= SECONDARY_MAX_WRONG_ATTEMPTS) {
        const correctChoice = currentQuestion.choices.find((entry) => entry.isCorrect);
        recordAttempt(false, attemptNumber, false);
        setFeedback({
          kind: "revealed",
          message: `The answer is “${correctChoice?.label ?? item.word}”. ${item.studentMeaningEn}`,
        });
        clearAdvanceTimer();
        advanceTimerRef.current = window.setTimeout(() => advanceQuestion(false), 1400);
        return;
      }

      setFeedback({
        kind: "wrong",
        message: "Not yet. Try again.",
      });
      setSelectedChoiceId(null);
    },
    [
      advanceQuestion,
      clearAdvanceTimer,
      currentQuestion,
      feedback?.kind,
      item.studentMeaningEn,
      item.word,
      wrongAttempts,
    ],
  );

  useEffect(() => {
    if (!currentQuestion || isComplete) return;
    if (feedback?.kind === "correct" || feedback?.kind === "revealed") return;

    function onKeyDown(event: KeyboardEvent) {
      const choiceIndex = Number(event.key);
      if (!Number.isInteger(choiceIndex) || choiceIndex < 1) return;
      const choice = currentQuestion.choices[choiceIndex - 1];
      if (!choice) return;
      event.preventDefault();
      handleChoice(choice.id);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentQuestion, feedback?.kind, handleChoice, isComplete]);

  function handlePracticeAgain() {
    clearAdvanceTimer();
    setRunSeed(String(Number(runSeed) + 1));
    setQuestionIndex(0);
    setWrongAttempts(0);
    setResults([]);
    setFeedback(null);
    setSelectedChoiceId(null);
  }

  if (questions.length === 0) return null;

  return (
    <section className="rounded-xl border-2 border-kid-ink/25 bg-white p-4 shadow-sm">
      <h3 className={secondaryUi.cardTitle}>Practice this word</h3>

      {isComplete ? (
        <div className="mt-3 space-y-3">
          <p className={`${secondaryUi.body} text-kid-ink/85`} role="status">
            You finished {questions.length} question{questions.length === 1 ? "" : "s"} — {correctCount}{" "}
            correct.
          </p>
          <div className={clsx("flex flex-wrap gap-2", centered && "justify-center")}>
            <KidButton type="button" variant="secondary" className="!min-h-10 text-base" onClick={handlePracticeAgain}>
              Practice again
            </KidButton>
            <KidButton type="button" className="!min-h-10 text-base" onClick={onClose}>
              Back to quiz
            </KidButton>
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="mt-3 space-y-3">
          <p className={secondaryUi.eyebrowMuted}>
            Question {questionIndex + 1} of {questions.length}
          </p>
          <p className={`whitespace-pre-line ${secondaryUi.bodyLarge}`}>
            {currentQuestion.prompt}
          </p>

          <div className="space-y-2">
            {currentQuestion.choices.map((choice, index) => {
              const choiceLocked =
                feedback?.kind === "correct" || feedback?.kind === "revealed";

              return (
              <button
                key={choice.id}
                type="button"
                disabled={choiceLocked}
                aria-pressed={selectedChoiceId === choice.id}
                aria-keyshortcuts={`${index + 1}`}
                onClick={() => handleChoice(choice.id)}
                className={clsx(
                  `w-full rounded-lg border-2 px-3 py-3 text-left ${secondaryUi.body} font-extrabold leading-snug transition-[transform,box-shadow] [touch-action:manipulation] hover:brightness-[0.98] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100`,
                  selectedChoiceId === choice.id
                    ? "border-kid-ink bg-kid-accent text-kid-ink"
                    : "border-kid-ink/25 bg-kid-panel/30 text-kid-ink",
                  choiceLocked && "opacity-80",
                )}
              >
                <span className="mr-2 tabular-nums text-kid-ink/50">{index + 1}.</span>
                {choice.label}
              </button>
              );
            })}
          </div>

          {feedback ? (
            <p
              className={clsx(
                `rounded-lg px-3 py-2.5 ${secondaryUi.body}`,
                feedback.kind === "correct" && "bg-emerald-50 text-emerald-950",
                feedback.kind === "wrong" && "bg-amber-50 text-amber-950",
                feedback.kind === "revealed" && "bg-sky-50 text-sky-950",
              )}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
