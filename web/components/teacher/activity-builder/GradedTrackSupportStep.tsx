"use client";

import { BookOpenText, Headphones, LifeBuoy } from "lucide-react";
import {
  activityCountLabel,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks";

type Props = {
  document: ActivityTrackDocument;
  onPatch: (
    updater: (current: ActivityTrackDocument) => ActivityTrackDocument,
  ) => void;
  onEditActivity: (partId: string) => void;
};

export function GradedTrackSupportStep({
  document: track,
  onPatch,
  onEditActivity,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-extrabold text-stone-950">Student support</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-stone-600">
          Give students clear directions and optional help without crowding every
          activity editor.
        </p>
      </div>

      <label className="block text-xs font-bold text-stone-800">
        Directions for the whole Learning Track
        <textarea
          value={track.instructions}
          onChange={(event) =>
            onPatch((current) => ({
              ...current,
              instructions: event.target.value,
            }))
          }
          rows={4}
          placeholder="Explain what students should do and how to finish."
          className="mt-1.5 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold leading-6"
        />
      </label>

      <label className="block text-xs font-bold text-stone-800">
        Encouragement or help message
        <textarea
          value={track.support.learnerMessage}
          onChange={(event) =>
            onPatch((current) => ({
              ...current,
              support: {
                ...current.support,
                learnerMessage: event.target.value,
              },
            }))
          }
          rows={3}
          placeholder="Example: Take your time. You can review each activity before submitting."
          className="mt-1.5 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold leading-6"
        />
      </label>

      <label className="block text-xs font-bold text-stone-800">
        Vocabulary help
        <textarea
          value={track.support.vocabularySupport}
          onChange={(event) =>
            onPatch((current) => ({
              ...current,
              support: {
                ...current.support,
                vocabularySupport: event.target.value,
              },
            }))
          }
          rows={4}
          placeholder={"word — simple meaning\nphrase — example or translation"}
          className="mt-1.5 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold leading-6"
        />
        <span className="mt-1 block text-[11px] font-semibold leading-5 text-stone-500">
          Students open this only when they need it.
        </span>
      </label>

      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
        <input
          type="checkbox"
          checked={track.support.readDirectionsAloud}
          onChange={(event) =>
            onPatch((current) => ({
              ...current,
              support: {
                ...current.support,
                readDirectionsAloud: event.target.checked,
              },
            }))
          }
          className="mt-0.5 h-4 w-4 accent-teal-700"
        />
        <span>
          <span className="flex items-center gap-1.5 text-xs font-extrabold text-stone-900">
            <Headphones className="h-4 w-4 text-teal-700" />
            Let students hear the directions
          </span>
          <span className="mt-1 block text-[11px] font-semibold leading-5 text-stone-500">
            Adds a read-aloud button to the real student player.
          </span>
        </span>
      </label>

      <section className="border-t border-stone-200 pt-5">
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-teal-700" />
          <h2 className="text-xs font-extrabold uppercase tracking-wide text-stone-700">
            Activity-level directions
          </h2>
        </div>
        <p className="mt-1 text-xs font-semibold leading-5 text-stone-500">
          Each activity keeps its own directions, required status, and assessment
          behavior.
        </p>
        <ul className="mt-3 space-y-2">
          {track.parts.map((part) => (
            <li
              key={part.id}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
            >
              <BookOpenText className="h-4 w-4 shrink-0 text-stone-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold text-stone-900">
                  {part.label}
                </span>
                <span className="block text-[11px] font-semibold text-stone-500">
                  {activityCountLabel(part)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onEditActivity(part.id)}
                className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-stone-300 px-3 text-xs font-bold text-stone-700"
              >
                Edit support
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
