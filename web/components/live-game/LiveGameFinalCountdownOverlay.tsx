"use client";

import { AnimatePresence, motion } from "motion/react";

type Props = {
  digit: number | null;
};

export function LiveGameFinalCountdownOverlay({ digit }: Props) {
  return (
    <AnimatePresence mode="wait">
      {digit != null ?
        <motion.div
          key={digit}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="assertive"
          aria-label={`${digit} seconds left`}
        >
          <motion.p
            className="font-mono text-[min(28vw,12rem)] font-extrabold tabular-nums text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.15, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 24 }}
          >
            {digit}
          </motion.p>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
