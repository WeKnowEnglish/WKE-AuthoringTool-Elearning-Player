"use client";

import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import {
  ACTIVITY_TRACK_PART_CATALOG,
  activityCountLabel,
  type ActivityTrackDocument,
  type ActivityTrackPart,
} from "@/lib/activity-tracks";

type Props = {
  document: ActivityTrackDocument;
  onAdd: () => void;
  onEdit: (partId: string) => void;
  onMove: (partId: string, direction: -1 | 1) => void;
  onDuplicate: (partId: string) => void;
  onRemove: (partId: string) => void;
  onResetFromOrigin: () => void;
};

function partTypeLabel(part: ActivityTrackPart) {
  return (
    ACTIVITY_TRACK_PART_CATALOG.find((entry) => entry.kind === part.kind)?.label ??
    part.kind
  );
}

export function GradedTrackActivitiesStep({
  document,
  onAdd,
  onEdit,
  onMove,
  onDuplicate,
  onRemove,
  onResetFromOrigin,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-sky-800">
            Activity sequence
          </p>
          <p className="mt-1 text-sm font-semibold text-sky-950">
            {document.parts.length} activit
            {document.parts.length === 1 ? "y" : "ies"} in the student track
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-sky-700 px-3 text-xs font-extrabold text-white"
        >
          <Plus className="h-4 w-4" />
          Add activity
        </button>
      </div>

      {document.parts.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-white p-6 text-center"
        >
          <Plus className="h-7 w-7 text-sky-700" />
          <span className="mt-2 text-sm font-extrabold text-stone-950">
            Add the first student activity
          </span>
          <span className="mt-1 text-xs font-semibold text-stone-600">
            Choose an activity type and begin authoring immediately.
          </span>
        </button>
      ) : (
        <ol className="space-y-2">
          {document.parts.map((part, index) => {
            const canDuplicate =
              part.source.type === "homework_part" ||
              part.source.type === "template_section";
            const canRemove =
              document.mode !== "graded" || document.parts.length > 1;
            return (
              <li
                key={part.id}
                className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-black text-sky-900">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(part.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-extrabold text-stone-950">
                      {part.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-stone-500">
                      {partTypeLabel(part)}
                      {" · " + activityCountLabel(part)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(part.id)}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-lg bg-stone-900 px-3 text-xs font-bold text-white"
                  >
                    Edit
                  </button>
                </div>
                <div
                  role="group"
                  aria-label={"Actions for " + part.label}
                  className="mt-3 flex flex-wrap items-center gap-1 border-t border-stone-100 pt-2"
                >
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onMove(part.id, -1)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Earlier
                  </button>
                  <button
                    type="button"
                    disabled={index >= document.parts.length - 1}
                    onClick={() => onMove(part.id, 1)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                  >
                    Later
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {canDuplicate ? (
                    <button
                      type="button"
                      onClick={() => onDuplicate(part.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-stone-600 hover:bg-stone-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!canRemove}
                    onClick={() => onRemove(part.id)}
                    className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {document.gradedOrigin ? (
        <button
          type="button"
          onClick={() => {
            const message =
              document.gradedOrigin?.preset === "blank"
                ? "Clear every activity from this Learning Track?"
                : "Reset every activity from the original template? Your activity edits will be lost.";
            if (window.confirm(message)) onResetFromOrigin();
          }}
          className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-bold text-stone-500 underline hover:text-rose-700"
        >
          {document.gradedOrigin.preset === "blank"
            ? "Clear all activities"
            : "Reset activities from template"}
        </button>
      ) : null}
    </div>
  );
}
