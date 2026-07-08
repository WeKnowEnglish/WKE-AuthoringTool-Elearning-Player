"use client";

import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { KidButton, kidLinkPressClasses } from "@/components/kid-ui/KidButton";
import { formatBlankSentence } from "@/lib/board-game/question-utils";
import type { Question } from "@/lib/board-game/types";

type Props = {
  open: boolean;
  question: Question | null;
  readOnly?: boolean;
  onCorrect: () => void;
  onIncorrect: () => void;
  onSkip: () => void;
};

function MultipleChoiceOptions({
  question,
  selectedOption,
  onSelectOption,
}: {
  question: Extract<Question, { type: "multiple_choice" }>;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
}) {
  return (
    <>
      <p className="text-2xl font-semibold leading-snug text-kid-ink md:text-3xl">{question.prompt}</p>
      <ul className="mt-6 space-y-3" role="listbox" aria-label="Answer choices">
        {question.options.map((option, index) => {
          const isSelected = selectedOption === option;
          return (
            <li key={`${question.id}-${option}`}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelectOption(option)}
                className={clsx(
                  "w-full rounded-xl border-4 px-5 py-4 text-left text-xl font-semibold text-kid-ink",
                  kidLinkPressClasses,
                  "hover:bg-kid-surface focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink",
                  isSelected ?
                    "border-kid-accent bg-kid-accent/25 shadow-[0_0_0_2px_var(--kid-accent)]"
                  : "border-kid-ink bg-kid-surface-muted hover:scale-[1.02] motion-reduce:hover:scale-100",
                )}
              >
                {String.fromCharCode(65 + index)}. {option}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function QuestionBody({
  question,
  selectedOption,
  onSelectOption,
}: {
  question: Question;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
}) {
  if (question.type === "multiple_choice") {
    return (
      <MultipleChoiceOptions
        question={question}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
      />
    );
  }

  const { before, after } = formatBlankSentence(question.sentence);
  const hasBlank = /___|\[blank\]|____|\.\.\./.test(question.sentence);
  const isSpeakingChallenge = !hasBlank;

  return (
    <>
      <h3 className="sr-only">{isSpeakingChallenge ? "Speaking Challenge" : "Fill in the Blank"}</h3>
      <p className="text-2xl font-semibold leading-snug text-kid-ink md:text-3xl">
        {isSpeakingChallenge ? (
          question.sentence
        ) : (
          <>
            {before}
            <span className="mx-2 inline-block min-w-28 border-b-4 border-kid-accent bg-kid-accent/20 px-2">
              &nbsp;
            </span>
            {after}
          </>
        )}
      </p>
    </>
  );
}

export function QuestionModal({
  open,
  question,
  readOnly = false,
  onCorrect,
  onIncorrect,
  onSkip,
}: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOption(null);
  }, [question?.id]);

  if (!open || !question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border-4 border-kid-ink bg-kid-panel p-6 shadow-[8px_8px_0_0_var(--kid-shadow)]"
      >
        <h2 className="text-center text-2xl font-extrabold uppercase tracking-wide text-kid-ink">
          {readOnly ? "Question Time" : question.type === "multiple_choice" ? "Multiple Choice" : "Question"}
        </h2>
        <div className="mt-6 border-y-4 border-kid-ink/20 py-6">
          <QuestionBody
            question={question}
            selectedOption={selectedOption}
            onSelectOption={readOnly ? () => {} : setSelectedOption}
          />
        </div>
        {readOnly ?
          <p className="mt-6 text-center text-sm font-semibold text-kid-ink/70">
            Watch the board — your teacher is running this question.
          </p>
        : <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <KidButton className="bg-kid-success text-lg text-white hover:bg-green-600" onClick={onCorrect}>
              ✓ Correct <span className="text-sm opacity-70">(Enter)</span>
            </KidButton>
            <KidButton variant="secondary" className="text-lg" onClick={onIncorrect}>
              ✗ Incorrect <span className="text-sm opacity-70">(X)</span>
            </KidButton>
            <KidButton variant="accent" className="text-lg" onClick={onSkip}>
              Skip <span className="text-sm opacity-70">(S / N)</span>
            </KidButton>
          </div>
        }
      </motion.div>
    </div>
  );
}

export function DiceRollOverlay({
  open,
  value,
  spinning,
}: {
  open: boolean;
  value: number | null;
  spinning: boolean;
}) {
  const [display, setDisplay] = useState(1);

  useEffect(() => {
    if (!open || !spinning) return;
    const interval = window.setInterval(() => {
      setDisplay(Math.floor(Math.random() * 6) + 1);
    }, 80);
    return () => window.clearInterval(interval);
  }, [open, spinning]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
        >
          <motion.div
            animate={
              spinning ?
                { rotate: 12, scale: 1.08 }
              : { rotate: 0, scale: 1 }
            }
            transition={
              spinning ?
                { repeat: Infinity, repeatType: "reverse", duration: 0.15, ease: "easeInOut" }
              : { type: "tween", duration: 0.3, ease: "easeOut" }
            }
            className="flex h-40 w-40 items-center justify-center rounded-3xl border-4 border-kid-ink bg-kid-cta text-7xl font-extrabold text-kid-ink shadow-[8px_8px_0_0_var(--kid-shadow)]"
          >
            {spinning ? display : value ?? "?"}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
