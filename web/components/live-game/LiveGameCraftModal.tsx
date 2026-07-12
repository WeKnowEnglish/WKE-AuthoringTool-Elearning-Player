"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type { EnglishCraftCraftQuestionClient } from "@/lib/live-game/modes/english-craft/questions-client";

type Props = {
  open: boolean;
  question: EnglishCraftCraftQuestionClient | null;
  recipeLabel?: string;
  costSummary?: string;
  tokenStatus?: LiveGameChallengeTokenStatus;
  isSubmitting?: boolean;
  feedback?: "correct" | "incorrect" | null;
  error?: string | null;
  onSubmit: (order: string[]) => void;
  onSkip?: () => void;
  onClose: () => void;
};

export function LiveGameCraftModal({
  open,
  question,
  recipeLabel = "Craft",
  costSummary,
  tokenStatus = "ready",
  isSubmitting = false,
  feedback,
  error,
  onSubmit,
  onSkip,
  onClose,
}: Props) {
  const [filled, setFilled] = useState<string[]>([]);
  const canSubmit = tokenStatus === "ready" && !isSubmitting;
  const canSkip = canSubmit && onSkip != null;

  useEffect(() => {
    if (!open) {
      setFilled([]);
    }
  }, [open, question?.id]);

  const bank = useMemo(() => {
    if (!question) return [];
    return question.wordBank.filter((word) => !filled.includes(word));
  }, [filled, question]);

  if (!question) return null;

  const slotCount = question.slotCount;

  function addWord(word: string) {
    if (isSubmitting || filled.length >= slotCount) return;
    setFilled((current) => [...current, word]);
  }

  function clearSlot(index: number) {
    if (isSubmitting) return;
    setFilled((current) => current.filter((_, slotIndex) => slotIndex !== index));
  }

  function handleSubmit() {
    if (filled.length !== slotCount) return;
    onSubmit(filled);
  }

  return (
    <AnimatePresence>
      {open ?
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
            aria-labelledby="live-game-craft-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="live-game-craft-title" className="text-xl font-extrabold text-kid-ink">
                {recipeLabel} — sentence craft
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm font-bold text-kid-ink/70 hover:bg-kid-surface"
              >
                Close
              </button>
            </div>

            {costSummary ?
              <p className="mt-1 text-sm font-bold text-kid-ink/70">Cost: {costSummary}</p>
            : null}

            <p className="text-lg font-semibold leading-snug text-kid-ink">{question.prompt}</p>

            <p className="mt-4 text-sm font-bold text-kid-ink/80">Your sentence</p>
            <div className="mt-2 flex min-h-14 flex-wrap gap-2 rounded-xl border-4 border-kid-ink/25 bg-kid-surface-muted p-3">
              {Array.from({ length: slotCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => clearSlot(index)}
                  className="min-w-[5rem] rounded-lg border-2 border-kid-ink/30 bg-white px-2 py-2 text-center text-base font-semibold text-kid-ink hover:bg-kid-surface"
                >
                  {filled[index] ?? "—"}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm font-bold text-kid-ink/80">Word bank</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {bank.map((word) => (
                <KidButton
                  key={word}
                  type="button"
                  variant="secondary"
                  className="!min-h-10 !min-w-0 text-base"
                  disabled={!canSubmit}
                  onClick={() => addWord(word)}
                >
                  {word}
                </KidButton>
              ))}
            </div>

            {tokenStatus === "pending" ?
              <p className="mt-3 text-sm font-semibold text-kid-ink/70">Connecting...</p>
            : null}
            {feedback === "incorrect" ?
              <p className="mt-3 text-sm font-semibold text-red-700">Not quite — try again!</p>
            : null}
            {error ?
              <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
            : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {onSkip ?
                <KidButton variant="secondary" disabled={!canSkip} onClick={onSkip}>
                  Skip
                </KidButton>
              : null}
              <KidButton
                variant="secondary"
                disabled={!canSubmit}
                onClick={() => setFilled([])}
              >
                Clear
              </KidButton>
              <KidButton variant="secondary" disabled={isSubmitting} onClick={onClose}>
                Cancel
              </KidButton>
              <KidButton
                variant="primary"
                disabled={filled.length !== slotCount || !canSubmit}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Checking..." : recipeLabel}
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
