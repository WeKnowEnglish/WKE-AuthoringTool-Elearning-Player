"use client";

import { clsx } from "clsx";
import { motion } from "motion/react";

type Props = {
  lastRoll: number | null;
  canRoll: boolean;
  onRoll: () => void;
  idleBounce?: boolean;
  className?: string;
};

export function DiceRollButton({
  lastRoll,
  canRoll,
  onRoll,
  idleBounce = false,
  className,
}: Props) {
  const label = lastRoll ?? "?";

  return (
    <motion.button
      type="button"
      animate={idleBounce && canRoll ? { y: [0, -3, 0] } : { y: 0 }}
      transition={idleBounce && canRoll ? { repeat: Infinity, duration: 1.2 } : undefined}
      disabled={!canRoll}
      aria-label={lastRoll !== null ? `Last roll ${lastRoll}. Roll dice` : "Roll dice"}
      onClick={onRoll}
      className={clsx(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-4 border-kid-ink bg-kid-cta text-xl font-extrabold text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)] transition-[transform,opacity] duration-100",
        "hover:enabled:scale-105 active:enabled:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:hover:enabled:scale-100",
        "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink",
        lastRoll !== null ? "kid-animate-pop" : "",
        className,
      )}
    >
      {label}
    </motion.button>
  );
}
