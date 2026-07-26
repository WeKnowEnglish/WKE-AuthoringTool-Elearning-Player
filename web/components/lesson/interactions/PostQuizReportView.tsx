"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  summarizePostQuizReport,
  type TrackScreenOutcome,
} from "@/lib/learning-tracks/report-results";

type PostQuizReportPayload = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "post_quiz_report" }
>;

export function PostQuizReportView({
  parsed,
  outcomes,
  sourceScreenIds,
  onNext,
  onBack,
  showBack,
}: {
  parsed: PostQuizReportPayload;
  outcomes: Record<string, TrackScreenOutcome>;
  sourceScreenIds: string[];
  onNext: () => void;
  onBack: () => void;
  showBack: boolean;
}) {
  const { total, completed, firstTry, hasRuntimeResults } =
    summarizePostQuizReport(sourceScreenIds, outcomes);

  const encouragement =
    !hasRuntimeResults
      ? parsed.encouragement
      : completed === total && firstTry === total
        ? "Excellent! You completed everything on your first try."
        : completed === total
          ? "Well done! You kept trying and completed the whole activity."
          : "Good effort—every answer helps you learn.";

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center py-3 text-kid-ink">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border-4 border-kid-ink bg-white shadow-[8px_8px_0_#152668]">
        <div className="bg-gradient-to-br from-sky-100 via-white to-amber-100 px-6 py-7 text-center sm:px-10">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-kid-ink bg-kid-cta text-4xl shadow-[4px_4px_0_#152668]"
            aria-hidden
          >
            ★
          </div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-sky-700">
            {parsed.source_beat_label} complete
          </p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{parsed.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg font-semibold leading-relaxed text-kid-ink/80">
            {encouragement}
          </p>

          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-4 py-3">
              <p className="text-3xl font-extrabold tabular-nums">
                {hasRuntimeResults ? `${completed}/${total}` : total}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
                {hasRuntimeResults ? "Completed" : "Questions"}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-kid-ink/20 bg-white px-4 py-3">
              <p className="text-3xl font-extrabold tabular-nums">
                {hasRuntimeResults ? firstTry : "—"}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-kid-ink/60">
                First try
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-4 border-kid-ink bg-kid-surface-muted px-6 py-5 sm:px-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sky-700">
            Get ready
          </p>
          <p className="mt-1 text-xl font-extrabold">{parsed.next_activity_cue}</p>
          <div className="mt-4 flex flex-wrap justify-between gap-3">
            {showBack ? (
              <KidButton type="button" variant="secondary" onClick={onBack}>
                Back
              </KidButton>
            ) : (
              <span />
            )}
            <KidButton type="button" onClick={onNext}>
              Start {parsed.next_activity_label} →
            </KidButton>
          </div>
        </div>
      </section>
    </div>
  );
}
