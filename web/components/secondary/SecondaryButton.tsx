"use client";

import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

/** Desk-sized Secondary control — replaces KidButton on Secondary surfaces. */
export function SecondaryButton({
  children,
  className,
  variant = "primary",
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "[touch-action:manipulation] select-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        "min-h-11 min-w-[8rem] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" ? secondaryUi.btnPrimary : secondaryUi.btnSecondary,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
