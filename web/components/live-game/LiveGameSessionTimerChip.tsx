"use client";

import { clsx } from "clsx";

type Props = {
  label: string;
  urgent?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function LiveGameSessionTimerChip({ label, urgent = false, className, onClick, disabled }: Props) {
  const classes = clsx(
        "rounded-xl border-2 px-3 py-2 text-left backdrop-blur-sm",
        urgent ?
          "border-red-300/80 bg-red-950/85 text-red-50"
        : "border-sky-300/60 bg-sky-950/80 text-sky-50",
        onClick && "pointer-events-auto cursor-pointer transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-wait disabled:opacity-70",
        className,
      );
  const content = <>
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">Time left</p>
      <p className="font-mono text-lg font-extrabold tabular-nums leading-tight">{label}</p>
      {onClick ? <p className="text-[10px] font-extrabold text-white/80">Click +1 minute</p> : null}
    </>;
  if (onClick) {
    return <button type="button" className={classes} onClick={onClick} disabled={disabled} aria-label={`${label} remaining. Add one minute.`}>{content}</button>;
  }
  return (
    <div className={classes} role="timer" aria-live="polite" aria-label={`${label} remaining`}>
      {content}
    </div>
  );
}
