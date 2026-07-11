"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LiveGameLobbyNotice } from "@/lib/live-game/liveblocks/config";

const NOTICE_DISMISS_MS = 8000;

type Props = {
  notice: LiveGameLobbyNotice | null;
  isHost: boolean;
};

function resolveNoticeCopy(notice: LiveGameLobbyNotice, isHost: boolean): string {
  if (notice.reason === "timeout") {
    return "Time's up! Back in the lobby.";
  }
  return isHost ?
      "You ended the round early. Start again when ready."
    : "Round ended. Waiting for your teacher to start again.";
}

export function LiveGameLobbyNoticeBanner({ notice, isHost }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notice) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timeoutId = window.setTimeout(() => setVisible(false), NOTICE_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [notice?.at, notice?.reason]);

  const copy = notice ? resolveNoticeCopy(notice, isHost) : "";

  return (
    <AnimatePresence>
      {visible && notice ?
        <motion.div
          key={`${notice.reason}-${notice.at}`}
          className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex justify-center px-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="status"
          aria-live="polite"
        >
          <div className="max-w-lg rounded-2xl border-4 border-sky-200 bg-sky-600 px-5 py-3 text-center shadow-xl">
            <p className="text-sm font-extrabold text-white sm:text-base">{copy}</p>
          </div>
        </motion.div>
      : null}
    </AnimatePresence>
  );
}
