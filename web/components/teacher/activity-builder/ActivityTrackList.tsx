"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  ACTIVITY_TRACK_MODE_COPY,
  deleteActivityTrackDraft,
  listActivityTrackDrafts,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks";

function formatUpdated(value: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ActivityTrackList() {
  const [drafts, setDrafts] = useState<ActivityTrackDocument[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = () => setDrafts(listActivityTrackDrafts());

  useEffect(() => {
    refresh();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <p className="px-1 py-8 text-sm font-semibold text-stone-500">Loading drafts…</p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Activity Builder
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-stone-900">Track builder</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Practice = Learning Track compiler. Graded = homework templates with freeze
            and review. Assessment = Primary A2 English Check (free navigation, results
            after submit).
          </p>
        </div>
        <Link
          href="/teacher/activity-builder/tracks/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-800"
        >
          <Plus className="h-4 w-4" />
          New track
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-extrabold text-stone-900">No tracks yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">
            <span className="font-semibold text-stone-800">Practice</span> is for
            self-study sequences.{" "}
            <span className="font-semibold text-stone-800">Graded</span> is for
            homework you can review later.{" "}
            <span className="font-semibold text-stone-800">Assessment</span> is for
            end-of-unit checks without answer gating.
          </p>
          <Link
            href="/teacher/activity-builder/tracks/new"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white"
          >
            Create your first track
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/teacher/activity-builder/tracks/${draft.id}`}
                    className="truncate text-sm font-extrabold text-stone-900 hover:underline"
                  >
                    {draft.title}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      draft.mode === "graded"
                        ? "bg-amber-100 text-amber-900"
                        : draft.mode === "assessment"
                          ? "bg-violet-100 text-violet-900"
                          : "bg-sky-100 text-sky-900"
                    }`}
                  >
                    {ACTIVITY_TRACK_MODE_COPY[draft.mode].title}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-stone-500">
                  {draft.mode === "practice"
                    ? `${draft.practiceComposition?.beats.length ?? 0} beat${
                        (draft.practiceComposition?.beats.length ?? 0) === 1 ? "" : "s"
                      }`
                    : draft.mode === "assessment"
                      ? `${
                          draft.assessmentDefinition?.sections.reduce(
                            (count, section) => count + section.parts.length,
                            0,
                          ) ?? 0
                        } parts`
                      : `${draft.parts.length} part${draft.parts.length === 1 ? "" : "s"}`}{" "}
                  · Updated {formatUpdated(draft.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/teacher/activity-builder/tracks/${draft.id}`}
                  className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 hover:bg-stone-50"
                >
                  Open
                </Link>
                <button
                  type="button"
                  aria-label={`Delete ${draft.title}`}
                  onClick={() => {
                    if (!window.confirm(`Delete “${draft.title}”?`)) return;
                    deleteActivityTrackDraft(draft.id);
                    refresh();
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-600 hover:border-red-300 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
