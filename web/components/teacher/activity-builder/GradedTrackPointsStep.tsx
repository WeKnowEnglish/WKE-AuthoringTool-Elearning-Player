"use client";

import { CheckCircle2, LockKeyhole, Timer, Trophy } from "lucide-react";
import {
  trackScoringParts,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks";

type Props = {
  document: ActivityTrackDocument;
  onPatch: (
    updater: (current: ActivityTrackDocument) => ActivityTrackDocument,
  ) => void;
  onEditActivity: (partId: string) => void;
};

function policyLabel(policy: ReturnType<typeof trackScoringParts>[number]["policy"]) {
  if (policy === "teacher_review") return "Teacher reviewed";
  if (policy === "completion") return "Completion credit";
  if (policy === "automatic") return "Auto-graded";
  return "Ungraded";
}

export function GradedTrackPointsStep({
  document,
  onPatch,
  onEditActivity,
}: Props) {
  const scoring = trackScoringParts(document);
  const total = scoring.reduce((sum, part) => sum + part.maxScore, 0);

  const toggleRequired = (partId: string, required: boolean) => {
    onPatch((current) => ({
      ...current,
      parts: current.parts.map((part) =>
        part.id === partId && part.source.type === "homework_part"
          ? {
              ...part,
              source: {
                type: "homework_part" as const,
                part: { ...part.source.part, required },
              },
            }
          : part,
      ),
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-extrabold text-stone-950">Scoring overview</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-stone-600">
          These totals come from the actual questions, prompts, and grading rules
          frozen when the Learning Track is assigned.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-teal-800 p-4 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-teal-100">
            Total available
          </p>
          <p className="mt-1 text-3xl font-black">{total}</p>
          <p className="text-xs font-bold text-teal-100">points</p>
        </div>
        <label className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs font-bold text-stone-700">
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-teal-700" /> Estimated time
          </span>
          <input
            type="number"
            min={1}
            max={180}
            value={document.estimatedMinutes ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onPatch((current) => ({
                ...current,
                estimatedMinutes: value === "" ? null : Number(value) || null,
              }));
            }}
            placeholder="Minutes"
            className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm font-bold"
          />
        </label>
      </div>

      <ol className="space-y-2">
        {scoring.map((score, index) => {
          const trackPart = document.parts.find((part) => part.id === score.partId);
          const required =
            trackPart?.source.type === "homework_part"
              ? trackPart.source.part.required
              : true;
          const canToggleRequired = trackPart?.source.type === "homework_part";
          return (
            <li
              key={score.partId}
              className="rounded-xl border border-stone-200 bg-white p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs font-black text-stone-700">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-extrabold text-stone-950">
                    {score.label}
                  </span>
                  <span className="block text-[10px] font-semibold text-stone-500">
                    {score.itemCount} item{score.itemCount === 1 ? "" : "s"} · {policyLabel(score.policy)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-black text-stone-950">
                    {score.maxScore}
                  </span>
                  <span className="block text-[9px] font-bold uppercase tracking-wide text-stone-500">
                    points
                  </span>
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2">
                {canToggleRequired ? (
                  <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-stone-50 px-2.5 text-[11px] font-bold text-stone-700">
                    <input
                      type="checkbox"
                      checked={required}
                      onChange={(event) =>
                        toggleRequired(score.partId, event.target.checked)
                      }
                      className="h-4 w-4 accent-teal-700"
                    />
                    Required
                  </label>
                ) : (
                  <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-stone-50 px-2.5 text-[11px] font-bold text-stone-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Required
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onEditActivity(score.partId)}
                  className="ml-auto min-h-9 text-xs font-extrabold text-teal-800 underline"
                >
                  Edit questions and points
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
        <div className="flex items-start gap-3">
          <Trophy className="h-5 w-5 shrink-0 text-violet-700" />
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-violet-900">
              Platform rewards
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-violet-950/80">
              EXP and Gold are awarded by the existing student reward policy when
              submitted work qualifies. Keeping this policy platform-managed
              prevents individual tracks from distorting the learning economy.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-800">
              <LockKeyhole className="h-3.5 w-3.5" /> Uses the active platform reward rules
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
