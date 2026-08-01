"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { PrimaryChrome } from "@/components/primary/PrimaryChrome";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";

type Props = {
  title: string;
  eyebrow: string;
  dueLabel: string;
  instructions?: string | null;
  closed?: boolean;
  homeHref?: string;
  /** Play surface width — use `wide` for multi-column / template homework. */
  frame?: "standard" | "wide";
  /** Due date + instructions block under the sticky bar. */
  showContext?: boolean;
  children: ReactNode;
};

const FRAME_MAX = {
  standard: "max-w-3xl",
  wide: "max-w-7xl",
} as const;

/**
 * Product C play frame — sticky header + assignment context.
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
export function HomeworkPlayChrome({
  title,
  eyebrow,
  dueLabel,
  instructions,
  closed = false,
  homeHref = "/primary",
  frame = "standard",
  showContext = true,
  children,
}: Props) {
  const { muted, toggleMuted } = useAudioMuted();
  const maxWidth = FRAME_MAX[frame];
  const showMetaBlock =
    (showContext && (Boolean(dueLabel) || Boolean(instructions))) || closed;

  return (
    <PrimaryChrome className="min-h-dvh bg-[var(--pl-bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--pl-border)] bg-white/95 backdrop-blur-sm">
        <div
          className={`mx-auto flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 ${maxWidth}`}
        >
          <Link
            href={homeHref}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] hover:bg-white"
          >
            ← Home
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--pl-purple)]">
              {eyebrow}
            </p>
            <p className="truncate text-sm font-extrabold text-[var(--pl-ink)] sm:text-base">
              {title}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleMuted}
            aria-pressed={muted}
            aria-label={muted ? "Sound off" : "Sound on"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)] hover:bg-white"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <main className={`mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 ${maxWidth}`}>
        {showMetaBlock ? (
          <div className="mb-5 space-y-2">
            {showContext ? (
              <p className="text-sm font-semibold text-[var(--pl-muted)]">Due {dueLabel}</p>
            ) : null}
            {showContext && instructions ? (
              <p className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-3 text-sm text-[var(--pl-ink)] shadow-sm">
                {instructions}
              </p>
            ) : null}
            {closed ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
                This assignment is closed. You can still review it.
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>
    </PrimaryChrome>
  );
}

export function HomeworkProgressBar({
  label,
  current,
  total,
}: {
  label: string;
  current: number;
  total: number;
}) {
  const pct = Math.round((current / Math.max(1, total)) * 100);
  return (
    <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-card)] p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[var(--pl-muted)]">
        <span>{label}</span>
        <span className="tabular-nums">
          {current}/{total}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--pl-bg)]">
        <div
          className="h-full rounded-full bg-[var(--pl-teal)] transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function HomeworkFinishPanel({
  title,
  detail,
  saving,
  saved,
  saveError,
  onRetry,
  retryLabel,
  primaryHref = "/primary",
  primaryLabel = "Back to Home",
  onPrimary,
}: {
  title: string;
  detail: string;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
  onRetry: () => void;
  retryLabel: string;
  primaryHref?: string;
  primaryLabel?: string;
  /** When set, primary action is a button (e.g. close overlay) instead of a link. */
  onPrimary?: () => void;
}) {
  const primaryClassName =
    "inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98]";

  return (
    <div className="rounded-[1.75rem] border border-[var(--pl-success)]/30 bg-emerald-50 px-4 py-8 text-center shadow-sm sm:px-6">
      <p className="text-2xl font-extrabold tracking-tight text-[var(--pl-ink)]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">{detail}</p>
      {saving ? (
        <p className="mt-2 text-xs font-semibold text-[var(--pl-teal)]">Saving for your teacher…</p>
      ) : saved ? (
        <p className="mt-2 text-xs font-semibold text-[var(--pl-teal)]">Saved for your teacher.</p>
      ) : null}
      {saveError ? (
        <p className="mt-2 text-xs font-semibold text-amber-900">{saveError}</p>
      ) : null}
      <div className="mt-6 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        {onPrimary ? (
          <button type="button" onClick={onPrimary} className={primaryClassName}>
            {primaryLabel}
          </button>
        ) : (
          <Link href={primaryHref} className={primaryClassName}>
            {primaryLabel}
          </Link>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-white px-5 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)]"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
