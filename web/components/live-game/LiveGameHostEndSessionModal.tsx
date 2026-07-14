"use client";

import { AnimatePresence, motion } from "motion/react";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function LiveGameHostEndSessionModal({ open, onClose, onConfirm }: Props) {
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
            className="w-full max-w-md rounded-2xl border-4 border-kid-ink bg-white p-5 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-game-host-end-session-title"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="live-game-host-end-session-title" className="text-xl font-extrabold text-kid-ink">
                End this round?
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-sm font-bold text-kid-ink/70 hover:bg-kid-surface"
              >
                Cancel
              </button>
            </div>

            <p className="text-sm font-semibold text-kid-ink/80">
              Everyone will see their private learning report. You can return to the lobby and
              start another round when ready.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <KidButton type="button" variant="secondary" className="w-full" onClick={onClose}>
                Keep playing
              </KidButton>
              <KidButton type="button" variant="primary" className="w-full" onClick={onConfirm}>
                End and show reports
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
