"use client";

import {
  Award,
  BookOpen,
  Coins,
  Compass,
  Library,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { PrimaryProgressModel } from "@/lib/primary/build-primary-progress-model";

type Props = {
  model: PrimaryProgressModel;
  studentName: string;
  onContinueLearning?: () => void;
  onOpenVocabulary?: () => void;
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Trophy;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[var(--pl-muted)]">
        <Icon className="h-4 w-4 text-[var(--pl-purple)]" />
        <span className="text-xs font-extrabold uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--pl-ink)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs font-semibold text-[var(--pl-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

function ProgressMeter({
  label,
  current,
  total,
  accentClass = "bg-[var(--pl-teal)]",
}: {
  label: string;
  current: number;
  total: number;
  accentClass?: string;
}) {
  const pct =
    total > 0 ? Math.min(100, Math.round((100 * current) / total)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[var(--pl-muted)]">
        <span>{label}</span>
        <span className="tabular-nums">
          {current}/{total}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--pl-bg)]">
        <div
          className={`h-full rounded-full transition-[width] ${accentClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PrimaryProgressTab({
  model,
  studentName,
  onContinueLearning,
  onOpenVocabulary,
}: Props) {
  const earnedBadges = model.badges.filter((b) => b.earned);
  const lockedBadges = model.badges.filter((b) => !b.earned);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          My Progress
        </h1>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
          {studentName}&apos;s learning summary
        </p>
      </header>

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]">
              Your level
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">
              Level {model.level}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2 text-sm font-extrabold tabular-nums">
            <Coins className="h-4 w-4 text-[var(--pl-gold)]" />
            {model.gold} Gold
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[var(--pl-muted)]">
            <span>XP to next level</span>
            <span className="tabular-nums">
              {model.xpCurrent}/{model.xpRequired}
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--pl-bg)]">
            <div
              className="h-full rounded-full bg-[var(--pl-success)] transition-[width]"
              style={{ width: `${Math.round(model.levelProgress * 100)}%` }}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Words mastered"
          value={String(model.mastery.mastered)}
          hint={
            model.mastery.total > 0
              ? `${model.mastery.learning} still learning`
              : "Practice vocab to start"
          }
          icon={Sparkles}
        />
        <StatCard
          label="Vocab sets"
          value={`${model.vocabSets.completed}/${model.vocabSets.total}`}
          hint="Finished topics"
          icon={BookOpen}
        />
        <StatCard
          label="Stickers"
          value={String(model.stickers)}
          hint="From rewards & levels"
          icon={Award}
        />
        <StatCard
          label="Word finds"
          value={String(model.collectedWords)}
          hint="Collected from explore"
          icon={Library}
        />
      </div>

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-extrabold tracking-tight">Learning meters</h2>
        <div className="mt-4 space-y-4">
          <ProgressMeter
            label="Word mastery"
            current={model.mastery.mastered}
            total={Math.max(model.mastery.total, model.mastery.mastered)}
            accentClass="bg-[var(--pl-purple)]"
          />
          <ProgressMeter
            label="Vocabulary sets finished"
            current={model.vocabSets.completed}
            total={model.vocabSets.total}
          />
          <ProgressMeter
            label="World words discovered"
            current={model.exploration.discovered}
            total={Math.max(1, model.exploration.total)}
            accentClass="bg-[var(--pl-gold)]"
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {onContinueLearning ? (
            <button
              type="button"
              onClick={onContinueLearning}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-4 text-sm font-extrabold text-white hover:bg-[var(--pl-teal-hover)]"
            >
              Continue Learning
            </button>
          ) : null}
          {onOpenVocabulary ? (
            <button
              type="button"
              onClick={onOpenVocabulary}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 text-sm font-extrabold text-[var(--pl-purple)] hover:bg-[var(--pl-purple-soft)]"
            >
              Browse Vocabulary
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[var(--pl-purple)]" />
          <h2 className="text-lg font-extrabold tracking-tight">Awards</h2>
        </div>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
          {earnedBadges.length} of {model.badges.length} earned
        </p>

        {earnedBadges.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {earnedBadges.map((badge) => (
              <li
                key={badge.id}
                className="rounded-2xl border border-[var(--pl-success)]/30 bg-emerald-50 px-4 py-3"
              >
                <p className="text-sm font-extrabold text-[var(--pl-ink)]">
                  {badge.label}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--pl-muted)]">
                  {badge.description}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 py-3 text-sm font-semibold text-[var(--pl-muted)]">
            Finish a vocabulary set or earn a sticker to unlock your first award.
          </p>
        )}

        {lockedBadges.length > 0 ? (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--pl-muted)]">
              <Compass className="h-3.5 w-3.5" />
              Still to earn
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {lockedBadges.map((badge) => (
                <li
                  key={badge.id}
                  className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 py-3 opacity-80"
                >
                  <p className="text-sm font-extrabold text-[var(--pl-ink)]">
                    {badge.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--pl-muted)]">
                    {badge.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
