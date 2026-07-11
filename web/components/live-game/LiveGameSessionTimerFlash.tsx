"use client";

import { AnimatePresence, motion } from "motion/react";
import type { SessionTimerFlashKind } from "@/lib/live-game/session-timer";

type Props = {
  flash: SessionTimerFlashKind | null;
};

const FLASH_COPY: Record<SessionTimerFlashKind, string> = {
  two_min: "2 minutes left!",
  thirty_sec: "30 seconds left!",
};

export function LiveGameSessionTimerFlash({ flash }: Props) {
  return (
    <AnimatePresence>
      {flash ?
        <motion.div
          key={flash}
          className="pointer-events-none fixed inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-40 flex justify-center px-4"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          role="status"
          aria-live="assertive"
        >
          <div className="rounded-2xl border-4 border-amber-200 bg-amber-500 px-6 py-3 text-center shadow-2xl">
            <p className="text-xl font-extrabold text-amber-950 sm:text-2xl">{FLASH_COPY[flash]}</p>
          </div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
