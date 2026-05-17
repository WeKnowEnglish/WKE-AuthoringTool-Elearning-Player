"use client";

import { clsx } from "clsx";
import type { ReactNode } from "react";

export type InteractionFeedbackKind = "none" | "correct" | "wrong";

export function InteractionFeedbackShell({
  kind,
  children,
  fillStage = false,
}: {
  kind: InteractionFeedbackKind;
  children: ReactNode;
  /** Stretch to fill immersive lesson stage (vocab overlay). */
  fillStage?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl transition-[box-shadow,transform] duration-200",
        fillStage && "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        kind === "correct" && "kid-feedback-glow-correct p-0.5",
        kind === "wrong" && "kid-animate-shake",
      )}
    >
      {children}
    </div>
  );
}
