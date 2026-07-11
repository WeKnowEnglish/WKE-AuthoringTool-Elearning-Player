"use client";

import { clsx } from "clsx";

type Props = {
  label: string;
  urgent?: boolean;
  className?: string;
};

export function LiveGameSessionTimerChip({ label, urgent = false, className }: Props) {
  return (
    <div
      className={clsx(
        "rounded-xl border-2 px-3 py-2 backdrop-blur-sm",
        urgent ?
          "border-red-300/80 bg-red-950/85 text-red-50"
        : "border-sky-300/60 bg-sky-950/80 text-sky-50",
        className,
      )}
      role="timer"
      aria-live="polite"
      aria-label={`${label} remaining`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Time left</p>
      <p className="font-mono text-lg font-extrabold tabular-nums leading-tight">{label}</p>
    </div>
  );
}
