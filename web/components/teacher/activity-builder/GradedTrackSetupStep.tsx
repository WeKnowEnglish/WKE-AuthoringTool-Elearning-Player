"use client";

import {
  ACTIVITY_TRACK_MODE_COPY,
  type ActivityTrackDocument,
  type ActivityTrackLevel,
  type ActivityTrackMode,
} from "@/lib/activity-tracks";
import { getHomeworkTemplateDefinition } from "@/lib/homework-templates/registry";

type Props = {
  document: ActivityTrackDocument;
  onPatch: (
    updater: (current: ActivityTrackDocument) => ActivityTrackDocument,
  ) => void;
  onModeChange: (mode: ActivityTrackMode) => void;
};

export function GradedTrackSetupStep({
  document: track,
  onPatch,
  onModeChange,
}: Props) {
  const modeCopy = ACTIVITY_TRACK_MODE_COPY[track.mode];
  const originDefinition =
    track.gradedOrigin?.preset !== "blank" && track.gradedOrigin
      ? getHomeworkTemplateDefinition(track.gradedOrigin.templateId)
      : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-teal-800">
          Learning experience
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-teal-950">
          Establish what this Learning Track is. Support, scoring, media, and
          appearance stay in their own focused branches.
        </p>
      </section>

      <label className="block text-xs font-bold text-stone-800">
        Learning Track name
        <input
          value={track.title}
          onChange={(event) =>
            onPatch((current) => ({ ...current, title: event.target.value }))
          }
          className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold"
        />
      </label>

      <label className="block text-xs font-bold text-stone-800">
        Topic or subject
        <input
          value={track.topic}
          onChange={(event) =>
            onPatch((current) => ({ ...current, topic: event.target.value }))
          }
          placeholder="Example: Digital life, Past tense, Food vocabulary"
          className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold"
        />
      </label>

      <label className="block text-xs font-bold text-stone-800">
        Description
        <textarea
          value={track.description}
          onChange={(event) =>
            onPatch((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          rows={3}
          placeholder="Briefly describe what students will practice or demonstrate."
          className="mt-1.5 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold leading-6"
        />
      </label>

      <details className="rounded-xl border border-stone-200 bg-stone-50 p-3">
        <summary className="cursor-pointer text-xs font-extrabold text-stone-800">
          Learning Track type · {modeCopy.title}
        </summary>
        <fieldset className="mt-3">
        <legend className="sr-only">Learning Track type</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["practice", "graded", "assessment"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onModeChange(mode)}
              className={
                "rounded-xl px-2 py-2.5 text-xs font-extrabold " +
                (track.mode === mode
                  ? mode === "graded"
                    ? "bg-amber-500 text-white"
                    : mode === "assessment"
                      ? "bg-violet-600 text-white"
                      : "bg-sky-600 text-white"
                  : "border border-stone-200 bg-white text-stone-700")
              }
            >
              {mode === "practice"
                ? "Practice"
                : mode === "graded"
                  ? "Graded"
                  : "Assessment"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-stone-600">
          {modeCopy.blurb}
        </p>
        </fieldset>
      </details>

      {originDefinition ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-950">
          Cloned from <span className="font-extrabold">{originDefinition.title}</span>{" "}
          ({originDefinition.level})
        </p>
      ) : null}

      <label className="block text-xs font-bold text-stone-800">
          Student level
          <select
            value={track.level}
            onChange={(event) =>
              onPatch((current) => ({
                ...current,
                level: event.target.value as ActivityTrackLevel,
              }))
            }
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold"
          >
            <option value="either">Primary or Secondary</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
      </label>
    </div>
  );
}
