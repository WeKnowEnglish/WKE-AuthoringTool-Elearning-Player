"use client";

import { AnimatePresence, motion } from "motion/react";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  open: boolean;
  onClose: () => void;
  onLeaveOpen: () => void;
  onCloseLobby: () => void;
};

export function LiveGameHostLeaveModal({ open, onClose, onLeaveOpen, onCloseLobby }: Props) {
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
            aria-labelledby="live-game-host-leave-title"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id="live-game-host-leave-title" className="text-xl font-extrabold text-kid-ink">
                Leave this lobby?
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
              You can leave the room open so students can keep waiting, or close it for everyone.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <KidButton type="button" variant="secondary" className="w-full" onClick={onLeaveOpen}>
                Leave open
              </KidButton>
              <KidButton type="button" variant="primary" className="w-full" onClick={onCloseLobby}>
                Close lobby
              </KidButton>
            </div>
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
