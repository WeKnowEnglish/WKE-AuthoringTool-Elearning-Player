"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

export type InteractionFeedbackKind = "none" | "correct" | "wrong";

export function InteractionFeedbackShell({
  kind,
  children,
}: {
  kind: InteractionFeedbackKind;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl transition-[box-shadow,transform] duration-200",
        kind === "correct" && "kid-feedback-glow-correct p-0.5",
        kind === "wrong" && "kid-animate-shake",
      )}
    >
      {children}
    </div>
  );
}
