"use client";

import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { EnglishCraftMcQuestionClient } from "@/lib/live-game/modes/english-craft/questions-v1";

type Props = {
  open: boolean;
  question: EnglishCraftMcQuestionClient | null;
  isSubmitting?: boolean;
  feedback?: "correct" | "incorrect" | null;
  error?: string | null;
  onSubmit: (answer: string) => void;
  onClose: () => void;
};

export function LiveGameMcChallengeModal({
  open,
  question,
  isSubmitting = false,
  feedback,
  error,
  onSubmit,
  onClose,
}: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {open && question ?
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl border-4 border-kid-ink bg-white p-5 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-game-mc-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="live-game-mc-title" className="text-xl font-extrabold text-kid-ink">
                Chop tree — vocab check
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm font-bold text-kid-ink/70 hover:bg-kid-surface"
              >
                Close
              </button>
            </div>

            <p className="text-2xl font-semibold leading-snug text-kid-ink">{question.prompt}</p>

            <ul className="mt-5 space-y-2" role="listbox" aria-label="Answer choices">
              {question.options.map((option, index) => {
                const isSelected = selectedOption === option;
                return (
                  <li key={`${question.id}-${option}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={isSubmitting}
                      onClick={() => setSelectedOption(option)}
                      className={clsx(
                        "w-full rounded-xl border-4 px-4 py-3 text-left text-lg font-semibold text-kid-ink transition",
                        isSelected ?
                          "border-kid-accent bg-kid-accent/20"
                        : "border-kid-ink/25 bg-kid-surface-muted hover:border-kid-ink/50",
                      )}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </button>
                  </li>
                );
              })}
            </ul>

            {feedback === "incorrect" ?
              <p className="mt-3 text-sm font-semibold text-red-700">Not quite — try again!</p>
            : null}
            {error ?
              <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
            : null}

            <div className="mt-5 flex justify-end gap-2">
              <KidButton variant="secondary" disabled={isSubmitting} onClick={onClose}>
                Cancel
              </KidButton>
              <KidButton
                variant="primary"
                disabled={!selectedOption || isSubmitting}
                onClick={() => {
                  if (!selectedOption) return;
                  onSubmit(selectedOption);
                }}
              >
                {isSubmitting ? "Checking..." : "Submit"}
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
