"use client";

import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import type { PrimaryProgressModel } from "@/lib/primary/build-primary-progress-model";

type TodaySlice = {
  topicTitle: string;
  nextActivityLabel: string;
  activitiesDone: number;
  activitiesTotal: number;
};

type Props = {
  progressModel?: PrimaryProgressModel | null;
  today: TodaySlice;
  onContinueLearning: () => void;
  onOpenProgress?: () => void;
};

function pickRecentAchievement(progress: PrimaryProgressModel | null | undefined) {
  if (!progress) return null;
  const earned = progress.badges.filter((badge) => badge.earned);
  if (earned.length > 0) {
    const badge = earned[earned.length - 1]!;
    return {
      kind: "badge" as const,
      title: badge.label,
      detail: badge.description,
    };
  }
  if (progress.vocabSets.completed > 0) {
    return {
      kind: "sets" as const,
      title: `${progress.vocabSets.completed} set${progress.vocabSets.completed === 1 ? "" : "s"} finished`,
      detail: `${progress.vocabSets.completed} of ${progress.vocabSets.total} vocabulary sets`,
      current: progress.vocabSets.completed,
      total: Math.max(1, progress.vocabSets.total),
    };
  }
  if (progress.mastery.mastered > 0) {
    return {
      kind: "mastery" as const,
      title: `${progress.mastery.mastered} words mastered`,
      detail: "Keep going — awards unlock as you learn",
      current: progress.mastery.mastered,
      total: Math.max(1, progress.mastery.total, progress.mastery.mastered),
    };
  }
  return null;
}

export function PrimaryHomeResumeRow({
  progressModel,
  today,
  onContinueLearning,
  onOpenProgress,
}: Props) {
  const recent = pickRecentAchievement(progressModel);
  const progressPct =
    recent &&
    (recent.kind === "sets" || recent.kind === "mastery") &&
    recent.total > 0
      ? Math.min(100, Math.round((recent.current / recent.total) * 100))
      : today.activitiesTotal > 0
        ? Math.min(
            100,
            Math.round((today.activitiesDone / today.activitiesTotal) * 100),
          )
        : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <button
        type="button"
        onClick={onOpenProgress}
        disabled={!onOpenProgress}
        className="group flex min-h-[7.5rem] flex-col justify-between rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 text-left shadow-sm transition hover:border-[var(--pl-purple)] disabled:cursor-default sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]">
            {recent?.kind === "badge" ? (
              <Trophy className="h-5 w-5" aria-hidden />
            ) : (
              <Sparkles className="h-5 w-5" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]">
              Recent
            </p>
            {recent ? (
              <>
                <p className="mt-1 truncate text-base font-extrabold tracking-tight text-[var(--pl-ink)]">
                  {recent.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-[var(--pl-muted)]">
                  {recent.detail}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-base font-extrabold tracking-tight text-[var(--pl-ink)]">
                  Your first award awaits
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[var(--pl-muted)]">
                  Finish a vocabulary set or earn a sticker to unlock awards.
                </p>
              </>
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--pl-bg)]">
            <div
              className="h-full rounded-full bg-[var(--pl-purple)] transition-[width]"
              style={{ width: `${Math.max(progressPct, recent ? 12 : 4)}%` }}
            />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onContinueLearning}
        className="group relative flex min-h-[7.5rem] items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] bg-[var(--pl-teal)] px-5 py-4 text-left text-white shadow-sm transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.99] sm:px-6"
      >
        <span
          className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-10 right-16 h-24 w-24 rounded-full bg-white/10"
          aria-hidden
        />
        <span className="relative min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/80">
            Keep going
          </span>
          <span className="mt-1 block truncate text-xl font-extrabold tracking-tight sm:text-2xl">
            Continue learning
          </span>
          <span className="mt-1 block truncate text-sm font-bold text-white/90">
            {today.topicTitle}
            {today.nextActivityLabel ? ` · ${today.nextActivityLabel}` : ""}
          </span>
        </span>
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white/30 group-hover:translate-x-0.5">
          <ArrowRight className="h-8 w-8" strokeWidth={2.75} aria-hidden />
          <span className="sr-only">Continue learning</span>
        </span>
      </button>
    </div>
  );
}
