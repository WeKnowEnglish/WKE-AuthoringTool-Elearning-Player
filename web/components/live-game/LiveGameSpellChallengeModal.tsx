"use client";

import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { LiveGameChallengeTokenStatus } from "@/lib/live-game/challenge-token-status";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import { depositSpellModalTitle } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import type { EnglishCraftDepositSpellClient } from "@/lib/live-game/modes/english-craft/questions-deposit-client";

type Props = {
  open: boolean;
  spell: EnglishCraftDepositSpellClient | null;
  resourceType?: LiveGameResourceType;
  tokenStatus?: LiveGameChallengeTokenStatus;
  isSubmitting?: boolean;
  feedback?: "correct" | "incorrect" | null;
  error?: string | null;
  onSubmit: (spelling: string) => void;
  onClose: () => void;
};

export function LiveGameSpellChallengeModal({
  open,
  spell,
  resourceType = "wood",
  tokenStatus = "ready",
  isSubmitting = false,
  feedback,
  error,
  onSubmit,
  onClose,
}: Props) {
  const [spelling, setSpelling] = useState("");
  const canSubmit = tokenStatus === "ready" && !isSubmitting && spelling.trim().length > 0;

  useEffect(() => {
    if (!open) {
      setSpelling("");
      return;
    }
    setSpelling("");
  }, [open, spell?.spellHint]);

  return (
    <AnimatePresence>
      {open && spell ?
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
            aria-labelledby="live-game-spell-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="live-game-spell-title" className="text-xl font-extrabold text-kid-ink">
                {depositSpellModalTitle(resourceType)}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm font-bold text-kid-ink/70 hover:bg-kid-surface"
              >
                Close
              </button>
            </div>

            <p className="text-sm font-semibold text-kid-ink/70">{spell.storageLabel}</p>
            <p className="mt-2 text-2xl font-semibold leading-snug text-kid-ink">
              Spell the word that means:
            </p>
            <p className="mt-2 text-xl font-bold text-kid-accent">{spell.spellHint}</p>

            <label className="mt-5 block">
              <span className="sr-only">Your spelling</span>
              <input
                type="text"
                value={spelling}
                disabled={isSubmitting || tokenStatus !== "ready"}
                onChange={(event) => setSpelling(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSubmit) {
                    event.preventDefault();
                    onSubmit(spelling.trim());
                  }
                }}
                className={clsx(
                  "w-full rounded-xl border-4 px-4 py-3 text-lg font-semibold text-kid-ink",
                  "border-kid-ink/25 bg-kid-surface-muted focus:border-kid-accent focus:outline-none",
                )}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Type the adjective"
              />
            </label>

            {tokenStatus === "pending" ?
              <p className="mt-3 text-sm font-semibold text-kid-ink/70">Connecting...</p>
            : null}
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
                disabled={!canSubmit}
                onClick={() => {
                  if (!canSubmit) return;
                  onSubmit(spelling.trim());
                }}
              >
                {isSubmitting ? "Checking..." : "Deposit"}
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
