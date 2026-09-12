"use client";

import { useState, type ReactNode } from "react";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";

type Props = {
  /** Shown under the assignment chrome before play begins. */
  typeLabel: string;
  alreadyCompleted?: boolean;
  children: ReactNode;
};

/**
 * Deep-link landing: after sign-in, students confirm before the activity loads.
 */
export function HomeworkStartGate({ typeLabel, alreadyCompleted = false, children }: Props) {
  const [started, setStarted] = useState(false);
  const hydrated = useClientHydrated();

  if (started) return <>{children}</>;

  return (
    <div className="flex flex-col items-center rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-5 py-10 text-center shadow-sm sm:px-8">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--pl-purple)]">
        {typeLabel}
      </p>
      <h2 className="mt-2 text-xl font-extrabold text-[var(--pl-ink)] sm:text-2xl">
        {alreadyCompleted ? "Review this homework" : "Ready to start?"}
      </h2>
      <p className="mt-2 max-w-sm text-sm font-semibold text-[var(--pl-muted)]">
        {alreadyCompleted
          ? "You already finished this assignment. Open it again to look back."
          : "Your teacher assigned this work. Tap below when you are ready to begin."}
      </p>
      <button
        type="button"
        data-homework-start-ready={hydrated ? "true" : "false"}
        disabled={!hydrated}
        onClick={() => setStarted(true)}
        className="mt-6 inline-flex min-h-12 min-w-[12rem] items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-6 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      >
        {alreadyCompleted ? "Open homework" : "Start homework"}
      </button>
    </div>
  );
}
