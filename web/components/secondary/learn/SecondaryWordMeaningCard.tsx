"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { flushMasterySyncQueueForCurrentStudent } from "@/lib/mastery/supabase-sync";
import { notifySecondarySessionChanged } from "@/lib/secondary/secondary-session-events";
import { resolveSecondaryStudentId } from "@/lib/secondary/secondary-student-id";
import {
  compileSecondaryVnMeaningQuiz,
  secondaryVnMeaningQuizEvidenceMeta,
} from "@/lib/secondary/secondary-vn-meaning-quiz";
import { recordSecondaryLearnWordAttempt } from "@/lib/secondary/secondary-word-progress";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

type Props = {
  item: SecondaryVocabItem;
  sessionWordItemIds?: string[];
  dateKey?: string;
  centered?: boolean;
};

export function SecondaryWordMeaningCard({
  item,
  sessionWordItemIds = [],
  dateKey = "",
  centered = false,
}: Props) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [runSeed, setRunSeed] = useState("0");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [rejectedChoiceIds, setRejectedChoiceIds] = useState<string[]>([]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hasVietnamese = Boolean(item.vnMeaning?.trim());

  const choices = useMemo(
    () =>
      compileSecondaryVnMeaningQuiz({
        item,
        sessionWordItemIds,
        studentId: resolveSecondaryStudentId(),
        dateKey,
        runSeed,
      }),
    [item, sessionWordItemIds, dateKey, runSeed],
  );

  const quizAvailable = hasVietnamese && choices !== null;

  useEffect(() => {
    setQuizOpen(false);
    setWrongAttempts(0);
    setRejectedChoiceIds([]);
    setSelectedChoiceId(null);
    setQuizComplete(false);
    setFeedback(null);
    setRunSeed((current) => String(Number(current) + 1));
  }, [item.wordItemId]);

  function resetQuizState() {
    setWrongAttempts(0);
    setRejectedChoiceIds([]);
    setSelectedChoiceId(null);
    setQuizComplete(false);
    setFeedback(null);
  }

  function handleToggleQuiz() {
    if (quizOpen) {
      setQuizOpen(false);
      resetQuizState();
      return;
    }

    resetQuizState();
    setRunSeed((current) => String(Number(current) + 1));
    setQuizOpen(true);
  }

  function handleChoice(choiceId: string) {
    if (!choices || quizComplete) return;
    if (rejectedChoiceIds.includes(choiceId)) return;

    const choice = choices.find((entry) => entry.id === choiceId);
    if (!choice) return;

    setSelectedChoiceId(choiceId);

    if (choice.isCorrect) {
      const evidenceMeta = secondaryVnMeaningQuizEvidenceMeta(wrongAttempts);
      recordSecondaryLearnWordAttempt(
        {
          wordItemId: item.wordItemId,
          isCorrect: true,
          attemptedAt: new Date().toISOString(),
        },
        evidenceMeta,
      );
      notifySecondarySessionChanged();
      void flushMasterySyncQueueForCurrentStudent();

      setQuizComplete(true);
      setFeedback(
        wrongAttempts === 0 ?
          `Correct! “${item.word}” means ${item.vnMeaning}.`
        : `Correct on try ${wrongAttempts + 1}. “${item.word}” means ${item.vnMeaning}.`,
      );
      return;
    }

    setRejectedChoiceIds((current) => [...current, choiceId]);
    setWrongAttempts((count) => count + 1);
    setSelectedChoiceId(null);
    setFeedback("Not quite. Try again.");
  }

  return (
    <section className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel/40 p-4">
      <h3 className={secondaryUi.cardTitle}>What does it mean?</h3>
      <p className={`mt-2 ${secondaryUi.bodyLarge}`}>{item.studentMeaningEn}</p>
      {hasVietnamese ? (
        <div className={centered ? "mt-3 flex flex-col items-center" : "mt-3"}>
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-10 text-base"
            aria-expanded={quizOpen}
            onClick={handleToggleQuiz}
          >
            {quizOpen ? "Hide Vietnamese" : "Show Vietnamese"}
          </KidButton>

          {quizOpen && quizAvailable ? (
            <div className="mt-3 w-full space-y-3">
              <p className={secondaryUi.bodyMuted}>Which is the Vietnamese meaning?</p>
              <div className="space-y-2">
                {choices.map((choice, index) => {
                  const isRejected = rejectedChoiceIds.includes(choice.id);
                  const isSelected = selectedChoiceId === choice.id;
                  const isCorrectPick = quizComplete && choice.isCorrect;

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={quizComplete || isRejected}
                      aria-pressed={isSelected || isCorrectPick}
                      onClick={() => handleChoice(choice.id)}
                      className={clsx(
                        `w-full rounded-lg border-2 px-3 py-3 text-left ${secondaryUi.body} font-extrabold leading-snug transition-[transform,background-color,border-color] [touch-action:manipulation] hover:brightness-[0.98] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100`,
                        isRejected && "border-red-500 bg-red-50 text-red-950",
                        isCorrectPick && "border-emerald-600 bg-emerald-50 text-emerald-950",
                        !isRejected &&
                          !isCorrectPick &&
                          "border-kid-ink/25 bg-white text-kid-ink",
                        (quizComplete || isRejected) && "opacity-90",
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
                    quizComplete ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950",
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {feedback}
                </p>
              ) : null}
            </div>
          ) : null}

          {quizOpen && !quizAvailable ? (
            <p className={`mt-2 ${secondaryUi.bodyMuted}`}>{item.vnMeaning}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
