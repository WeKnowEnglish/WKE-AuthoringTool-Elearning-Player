"use client";

import { Columns3, ListOrdered, Palette } from "lucide-react";
import {
  type ActivityTrackDesignSettings,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks";
import { TrackCoverImageEditor } from "@/components/teacher/activity-builder/TrackCoverImageEditor";

type Props = {
  document: ActivityTrackDocument;
  onPatch: (
    updater: (current: ActivityTrackDocument) => ActivityTrackDocument,
  ) => void;
  onExpandPreview: () => void;
};

const THEME_OPTIONS: Array<{
  value: ActivityTrackDesignSettings["theme"];
  label: string;
  swatch: string;
}> = [
  { value: "teal", label: "Calm teal", swatch: "bg-teal-700" },
  { value: "navy", label: "Clear navy", swatch: "bg-slate-800" },
  { value: "warm", label: "Warm amber", swatch: "bg-amber-800" },
];

export function GradedTrackDesignStep({
  document: track,
  onPatch,
  onExpandPreview,
}: Props) {
  const patchDesign = (patch: Partial<ActivityTrackDesignSettings>) =>
    onPatch((current) => ({
      ...current,
      design: { ...current.design, ...patch },
    }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-stone-950">Student appearance</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-stone-600">
            These restrained choices update the real student viewport immediately
            and preserve readable contrast.
          </p>
        </div>
        <button
          type="button"
          onClick={onExpandPreview}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-bold text-stone-700"
        >
          <Columns3 className="h-3.5 w-3.5" /> Expand preview
        </button>
      </div>

      <fieldset>
        <legend className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800">
          <Palette className="h-4 w-4 text-teal-700" /> Color theme
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={track.design.theme === option.value}
              onClick={() => patchDesign({ theme: option.value })}
              className={
                "rounded-xl border p-2.5 text-left text-xs font-extrabold " +
                (track.design.theme === option.value
                  ? "border-teal-700 bg-teal-50 text-teal-950"
                  : "border-stone-200 bg-white text-stone-700")
              }
            >
              <span className={`mb-2 block h-7 rounded-lg ${option.swatch}`} />
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="text-xs font-extrabold text-stone-800">Content width</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["focused", "wide"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={track.design.contentWidth === value}
                onClick={() => patchDesign({ contentWidth: value })}
                className={
                  "min-h-11 rounded-xl border text-xs font-bold capitalize " +
                  (track.design.contentWidth === value
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-stone-200 bg-white text-stone-700")
                }
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800">
            <ListOrdered className="h-4 w-4 text-teal-700" /> Activity navigation
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["labels", "numbers"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={track.design.progressStyle === value}
                onClick={() => patchDesign({ progressStyle: value })}
                className={
                  "min-h-11 rounded-xl border text-xs font-bold capitalize " +
                  (track.design.progressStyle === value
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-stone-200 bg-white text-stone-700")
                }
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <section className="border-t border-stone-200 pt-5">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-stone-700">
          Learning Track cover
        </p>
        <TrackCoverImageEditor
          value={track.coverImageUrl ?? ""}
          title={track.title}
          onChange={(coverImageUrl) =>
            onPatch((current) => ({
              ...current,
              coverImageUrl: coverImageUrl || null,
            }))
          }
        />
      </section>
    </div>
  );
}
