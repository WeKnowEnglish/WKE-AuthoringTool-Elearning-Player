"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Shared press motion for `<Link>` styled as kid UI buttons (not covered by global `button` styles). */
export const kidLinkPressClasses =
  "transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100";

const kidLinkFocus =
  "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink";

export const kidLinkPrimaryClassName = clsx(
  "inline-flex min-h-14 min-w-[10rem] items-center justify-center rounded-lg border-4 border-kid-ink bg-kid-cta px-6 py-3 text-lg font-semibold text-kid-ink",
  kidLinkPressClasses,
  "hover:scale-110 hover:bg-kid-cta-hover active:bg-kid-cta-active motion-reduce:hover:scale-100",
  kidLinkFocus,
);

export const kidLinkSecondaryClassName = clsx(
  "inline-flex min-h-14 min-w-[10rem] items-center justify-center rounded-lg border-4 border-kid-ink bg-kid-panel px-6 py-3 text-lg font-semibold text-kid-ink",
  kidLinkPressClasses,
  "hover:bg-kid-surface-muted active:bg-kid-surface motion-reduce:hover:scale-100",
  kidLinkFocus,
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
};

export function KidButton({
  children,
  className,
  variant = "primary",
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={clsx(
        "[touch-action:manipulation] select-none rounded-lg border-4 border-kid-ink px-6 py-3 text-lg font-semibold text-kid-ink",
        variant === "primary" &&
          clsx(
            "bg-kid-cta hover:scale-110 hover:bg-kid-cta-hover active:bg-kid-cta-active motion-reduce:hover:scale-100",
            kidLinkFocus,
          ),
        variant === "secondary" &&
          clsx(
            "bg-kid-panel hover:bg-kid-surface-muted active:bg-kid-surface",
            kidLinkFocus,
          ),
        variant === "accent" &&
          clsx(
            "bg-kid-accent hover:scale-105 hover:bg-kid-accent-hover active:bg-kid-accent-active motion-reduce:hover:scale-100",
            kidLinkFocus,
          ),
        "disabled:cursor-not-allowed disabled:opacity-50",
        "min-h-14 min-w-[10rem]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
