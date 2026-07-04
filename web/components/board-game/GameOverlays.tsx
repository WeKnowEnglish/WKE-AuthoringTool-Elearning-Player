"use client";

import { motion, AnimatePresence } from "motion/react";
import type { EffectFeedbackState } from "@/lib/board-game/map/effects/landing-sequence";

const TONE_STYLES: Record<
  EffectFeedbackState["tone"],
  { border: string; bg: string }
> = {
  penalty: { border: "border-orange-500", bg: "bg-orange-100" },
  lucky: { border: "border-green-500", bg: "bg-green-100" },
  shortcut: { border: "border-sky-500", bg: "bg-sky-100" },
  neutral: { border: "border-kid-ink", bg: "bg-kid-surface" },
};

type EffectFeedbackProps = {
  open: boolean;
  feedback: EffectFeedbackState | null;
};

export function EffectFeedbackModal({ open, feedback }: EffectFeedbackProps) {
  const styles = feedback ? TONE_STYLES[feedback.tone] : TONE_STYLES.neutral;

  return (
    <AnimatePresence>
      {open && feedback ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: feedback.tone === "penalty" ? -4 : 0 }}
            animate={{ scale: 1, rotate: 0 }}
            className={`rounded-2xl border-4 px-8 py-10 text-center shadow-[8px_8px_0_0_var(--kid-shadow)] ${styles.border} ${styles.bg}`}
          >
            <p className="text-6xl">{feedback.emoji}</p>
            <p className="mt-4 text-3xl font-extrabold text-kid-ink">{feedback.title}</p>
            <p className="mt-2 text-xl font-semibold text-kid-ink/80">{feedback.message}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** @deprecated Use EffectFeedbackModal */
export function PenaltyModal({
  open,
  copy,
}: {
  open: boolean;
  copy: { title: string; message: string; emoji: string } | null;
}) {
  return (
    <EffectFeedbackModal
      open={open}
      feedback={copy ? { ...copy, tone: "penalty" } : null}
    />
  );
}

export function CelebrationOverlay({
  open,
  message,
  title,
}: {
  open: boolean;
  message?: string | null;
  title?: string | null;
}) {
  const headline = title ?? "Correct!";
  const copy = message ?? "+1 Point!";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-7xl">✓</p>
            <p className="mt-2 text-2xl font-extrabold text-green-200 drop-shadow-lg">{headline}</p>
            <p className="mt-1 text-4xl font-extrabold text-green-300 drop-shadow-lg">{copy}</p>
            <div className="mt-4 flex justify-center gap-2 text-4xl">
              {["⭐", "✨", "🌟", "✨", "⭐"].map((star, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  {star}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function LuckySpaceModal({
  open,
  emoji,
  label,
  message,
}: {
  open: boolean;
  emoji: string;
  label: string;
  message: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/65 p-4"
        >
          <motion.div
            initial={{ y: 40, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            className="rounded-2xl border-4 border-kid-ink bg-kid-surface px-8 py-10 text-center shadow-[8px_8px_0_0_var(--kid-shadow)]"
          >
            <p className="text-6xl">{emoji}</p>
            <p className="mt-3 text-2xl font-extrabold text-kid-ink">{label}</p>
            <p className="mt-2 text-xl font-semibold text-kid-ink/80">{message}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function TurnTransitionOverlay({
  open,
  playerName,
  playerColor,
}: {
  open: boolean;
  playerName: string;
  playerColor: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, x: 80 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -80 }}
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50"
        >
          <div
            className="rounded-2xl border-4 border-kid-ink px-10 py-8 text-center shadow-[6px_6px_0_0_var(--kid-shadow)]"
            style={{ backgroundColor: `${playerColor}55` }}
          >
            <p className="text-4xl font-extrabold text-kid-ink md:text-5xl">{playerName}&apos;s Turn!</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
