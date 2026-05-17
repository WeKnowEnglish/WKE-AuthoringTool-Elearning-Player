"use client";

import { clsx } from "clsx";
import { playSfx } from "@/lib/audio/sfx";

type Props = {
  active: boolean;
  onToggle: () => void;
  muted: boolean;
  className?: string;
};

function SkeletonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={clsx("h-5 w-5 stroke-current", className)}
      fill="none"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
      <path d="M12 7v5M8 20l4-8 4 8M6 12h12" />
    </svg>
  );
}

/** Toggle skeleton hierarchy editor. */
export function PuppetSkeletonToggle({ active, onToggle, muted, className }: Props) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Close skeleton editor" : "Edit puppet skeleton"}
      title={active ? "Close skeleton editor" : "Edit skeleton"}
      onClick={() => {
        playSfx("tap", muted);
        onToggle();
      }}
      className={clsx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-kid-ink",
        "bg-[#c8e6c9] text-kid-ink shadow-[3px_3px_0_#152668]",
        "transition-[transform,background-color] duration-100 ease-out",
        "hover:bg-[#a5d6a7] active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        active && "bg-[#66bb6a] hover:bg-[#81c784]",
        className,
      )}
    >
      <SkeletonIcon />
    </button>
  );
}
