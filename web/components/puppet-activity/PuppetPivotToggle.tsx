"use client";

import { clsx } from "clsx";
import { playSfx } from "@/lib/audio/sfx";

type Props = {
  active: boolean;
  onToggle: () => void;
  muted: boolean;
  className?: string;
};

function PivotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={clsx("h-5 w-5 stroke-current", className)}
      fill="none"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

/** Toggle pivot editor (dev tuning). */
export function PuppetPivotToggle({ active, onToggle, muted, className }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Close pivot editor" : "Edit puppet pivots"}
      title={active ? "Close pivot editor" : "Edit pivots"}
      onClick={() => {
        playSfx("tap", muted);
        onToggle();
      }}
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-kid-ink",
        "bg-[#ffe135] text-kid-ink shadow-[3px_3px_0_#152668]",
        "transition-[transform,background-color] duration-100 ease-out",
        "hover:bg-[#fff176] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        active && "bg-[#f5a623] hover:bg-[#ffb74d]",
        className,
      )}
    >
      <PivotIcon />
    </button>
  );
}
