"use client";

import { clsx } from "clsx";
import { playSfx } from "@/lib/audio/sfx";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  muted: boolean;
  className?: string;
};

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={clsx("h-5 w-5 fill-current", className)}
      aria-hidden
    >
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={clsx("h-5 w-5 fill-current", className)}
      aria-hidden
    >
      <path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" />
    </svg>
  );
}

/** Play / pause control for puppet + line motion (overrides system reduced-motion when on). */
export function PuppetMotionToggle({ enabled, onToggle, muted, className }: Props) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? "Pause puppet animations" : "Play puppet animations"}
      title={enabled ? "Pause animations" : "Play animations"}
      onClick={() => {
        playSfx("tap", muted);
        onToggle();
      }}
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-kid-ink",
        "bg-[#ffe135] text-kid-ink shadow-[3px_3px_0_#152668]",
        "transition-[transform,background-color] duration-100 ease-out",
        "hover:bg-[#fff176] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        enabled && "bg-[#b8e8fb] hover:bg-[#d4f1fc]",
        className,
      )}
    >
      {enabled ?
        <PauseIcon />
      : <PlayIcon />}
    </button>
  );
}
