"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  Library,
  Pencil,
  Play,
  Trophy,
} from "lucide-react";
import { AssignedHomeworkStrip } from "@/components/primary/AssignedHomeworkStrip";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { LearningBand } from "@/lib/learning-band";
import { VOCAB_PHASE_LABELS } from "@/lib/primary/vocab-continue";

type PathStepStatus = "complete" | "current" | "available" | "locked";

type LearnViewModel = {
  today: {
    topicTitle: string;
    goal: string;
    skill: string;
    activitiesDone: number;
    activitiesTotal: number;
    nextActivityLabel: string;
  };
  path: Array<{
    id: string;
    title: string;
    description: string;
    status: PathStepStatus;
  }>;
};

type Props = {
  model: LearnViewModel;
  reviewWordCount: number;
  learningBand: LearningBand | null;
  continueLabel: string;
  assignedHomework?: StudentHomeworkCard[];
  onContinue: () => void;
  onOpenReview: () => void;
  onOpenVocabulary: () => void;
  onOpenProgress: () => void;
  onOpenGrammar: () => void;
};

function PathIcon({ status, id }: { status: PathStepStatus; id: string }) {
  if (status === "complete") return <Check className="h-5 w-5" />;
  if (id === "learn") return <BookOpen className="h-5 w-5" />;
  if (id === "practice") return <Pencil className="h-5 w-5" />;
  if (id === "review") return <Library className="h-5 w-5" />;
  return <Trophy className="h-5 w-5" />;
}

function phaseStatus(
  index: number,
  activitiesDone: number,
  setComplete: boolean,
): "complete" | "current" | "upcoming" {
  if (setComplete || activitiesDone > index) return "complete";
  if (activitiesDone === index) return "current";
  return "upcoming";
}

export function PrimaryLearnTab({
  model,
  reviewWordCount,
  learningBand,
  continueLabel,
  assignedHomework = [],
  onContinue,
  onOpenReview,
  onOpenVocabulary,
  onOpenProgress,
  onOpenGrammar,
}: Props) {
  const progressPct = Math.round(
    (model.today.activitiesDone / Math.max(1, model.today.activitiesTotal)) * 100,
  );
  const setComplete = model.today.activitiesDone >= model.today.activitiesTotal;
  const secondaryEligible = isSecondaryEligibleBand(learningBand);

  function runPathStep(stepId: string) {
    if (stepId === "review") {
      onOpenReview();
      return;
    }
    if (stepId === "rewards") {
      onOpenProgress();
      return;
    }
    onContinue();
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Learn</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
          Follow today&apos;s path — Vocabulary is where you browse all topics.
        </p>
      </header>

      <AssignedHomeworkStrip items={assignedHomework} />

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]">
          Current unit
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{model.today.topicTitle}</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">
          Goal: {model.today.goal}
        </p>
        <span className="mt-3 inline-flex rounded-full bg-[var(--pl-purple-soft)] px-3 py-1 text-xs font-extrabold text-[var(--pl-purple)]">
          {model.today.skill}
        </span>

        <div className="mt-5 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] p-3">
          <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[var(--pl-muted)]">
            <span>Unit progress</span>
            <span className="tabular-nums">
              {model.today.activitiesDone}/{model.today.activitiesTotal} steps
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[var(--pl-success)] transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-[var(--pl-muted)]">
            Next: {model.today.nextActivityLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] sm:w-auto"
        >
          {continueLabel}
          <Play className="h-4 w-4 fill-current" />
        </button>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-extrabold tracking-tight">Activity sequence</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
          Steps inside your current vocabulary unit.
        </p>
        <ol className="mt-4 space-y-2">
          {VOCAB_PHASE_LABELS.map((label, index) => {
            const status = phaseStatus(
              index,
              model.today.activitiesDone,
              setComplete,
            );
            return (
              <li
                key={label}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
                  status === "current"
                    ? "border-[var(--pl-purple)] bg-[var(--pl-purple-soft)]"
                    : status === "complete"
                      ? "border-[var(--pl-success)]/30 bg-emerald-50"
                      : "border-[var(--pl-border)] bg-[var(--pl-bg)]"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                    status === "current"
                      ? "bg-[var(--pl-purple)] text-white"
                      : status === "complete"
                        ? "bg-[var(--pl-success)] text-white"
                        : "bg-white text-[var(--pl-muted)]"
                  }`}
                >
                  {status === "complete" ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">{label}</p>
                  <p className="text-xs font-semibold text-[var(--pl-muted)]">
                    {status === "complete"
                      ? "Done"
                      : status === "current"
                        ? "Up next"
                        : "Coming up"}
                  </p>
                </div>
                {status === "current" ? (
                  <button
                    type="button"
                    onClick={onContinue}
                    className="shrink-0 rounded-xl bg-[var(--pl-teal)] px-3 py-2 text-xs font-extrabold text-white hover:bg-[var(--pl-teal-hover)]"
                  >
                    Start
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-extrabold tracking-tight">Today&apos;s Path</h2>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
          Bigger goals for this learning session.
        </p>
        <ol className="mt-4 space-y-3">
          {model.path.map((step) => {
            const locked = step.status === "locked";
            const current = step.status === "current";
            const complete = step.status === "complete";
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => runPathStep(step.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                    current
                      ? "border-[var(--pl-purple)] bg-[var(--pl-purple-soft)]"
                      : complete
                        ? "border-[var(--pl-success)]/40 bg-emerald-50"
                        : locked
                          ? "cursor-not-allowed border-[var(--pl-border)] bg-[var(--pl-bg)] opacity-60"
                          : "border-[var(--pl-border)] bg-[var(--pl-bg)] hover:border-[var(--pl-purple)]/40"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      current
                        ? "bg-[var(--pl-purple)] text-white"
                        : complete
                          ? "bg-[var(--pl-success)] text-white"
                          : "bg-white text-[var(--pl-muted)]"
                    }`}
                  >
                    <PathIcon status={step.status} id={step.id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold">{step.title}</span>
                    <span className="mt-0.5 block text-xs font-semibold text-[var(--pl-muted)]">
                      {step.id === "review" && reviewWordCount > 0
                        ? `${reviewWordCount} words waiting · ${step.description}`
                        : step.description}
                    </span>
                  </span>
                  {!locked ? (
                    <ChevronRight className="h-5 w-5 shrink-0 text-[var(--pl-muted)]" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenGrammar}
          className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-4 text-left shadow-sm transition hover:border-[var(--pl-purple)]/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold">Grammar posters</span>
            <span className="mt-0.5 block text-xs font-semibold text-[var(--pl-muted)]">
              Read and practice grammar topics
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenVocabulary}
          className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-4 text-left shadow-sm transition hover:border-[var(--pl-purple)]/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--pl-bg)] text-[var(--pl-teal)]">
            <Library className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold">All vocabulary topics</span>
            <span className="mt-0.5 block text-xs font-semibold text-[var(--pl-muted)]">
              Browse the full topic catalog
            </span>
          </span>
        </button>
      </section>

      {secondaryEligible ? (
        <Link
          href="/secondary"
          className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm transition hover:border-[var(--pl-purple)]/40"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">Secondary vocabulary</span>
            <span className="mt-0.5 block text-xs font-semibold text-[var(--pl-muted)]">
              Match, cloze, and spelling practice for your band
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-[var(--pl-muted)]" />
        </Link>
      ) : null}
    </div>
  );
}
