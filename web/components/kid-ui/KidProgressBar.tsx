"use client";

import { clsx } from "clsx";

type Props = {
  currentIndex: number;
  total: number;
  className?: string;
};

/** Star-style progress; includes sr-only numeric text for accessibility. */
export function KidProgressBar({ currentIndex, total, className }: Props) {
  const n = Math.max(1, total);
  const filled = Math.min(currentIndex + 1, n);
  return (
    <div
      className={clsx("flex flex-wrap items-center justify-end gap-1", className)}
      role="group"
      aria-label="Lesson progress"
    >
      <span className="sr-only">
        Screen {currentIndex + 1} of {total}
      </span>
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={clsx(
            "text-lg leading-none transition-opacity duration-150",
            i < filled ? "opacity-100" : "opacity-25 grayscale",
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}
