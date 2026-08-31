"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink, ImageIcon, Music2, Video } from "lucide-react";
import {
  collectTrackMediaUsages,
  trackMediaIssues,
  type ActivityTrackDocument,
  type TrackMediaKind,
} from "@/lib/activity-tracks";

type Props = {
  document: ActivityTrackDocument;
  onEditActivity: (partId: string) => void;
  onOpenDesign: () => void;
};

function MediaIcon({ kind }: { kind: TrackMediaKind }) {
  if (kind === "audio") return <Music2 className="h-4 w-4" />;
  if (kind === "video") return <Video className="h-4 w-4" />;
  return <ImageIcon className="h-4 w-4" />;
}

export function GradedTrackMediaStep({
  document,
  onEditActivity,
  onOpenDesign,
}: Props) {
  const usages = collectTrackMediaUsages(document);
  const issues = trackMediaIssues(document);
  const counts = usages.reduce<Record<TrackMediaKind, number>>(
    (current, usage) => ({
      ...current,
      [usage.kind]: current[usage.kind] + 1,
    }),
    { image: 0, audio: 0, video: 0, document: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-stone-950">Media readiness</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-stone-600">
            Review every asset currently used by this Learning Track. Replace an
            asset from the activity where it appears.
          </p>
        </div>
        <Link
          href="/teacher/media"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-800 px-3 text-xs font-extrabold text-white"
        >
          Open Asset Library <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {(
          [
            ["image", "Images"],
            ["audio", "Audio"],
            ["video", "Video"],
            ["document", "Documents"],
          ] as const
        ).map(([kind, label]) => (
          <div key={kind} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <dt className="flex items-center gap-1.5 font-bold text-stone-500">
              <MediaIcon kind={kind} /> {label}
            </dt>
            <dd className="mt-1 text-xl font-black text-stone-950">{counts[kind]}</dd>
          </div>
        ))}
      </dl>

      {issues.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-amber-900">
            <AlertTriangle className="h-4 w-4" /> Media to finish
          </p>
          <ul className="mt-3 space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2 rounded-lg bg-white p-2.5">
                <span className="min-w-0 flex-1 text-xs font-semibold leading-5 text-amber-950">
                  {issue.message}
                </span>
                <button
                  type="button"
                  onClick={() => onEditActivity(issue.partId)}
                  className="shrink-0 text-xs font-extrabold text-amber-900 underline"
                >
                  Fix
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-900">
          All required listening media is ready.
        </p>
      )}

      {usages.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
          <p className="text-sm font-extrabold text-stone-900">
            This Learning Track currently uses text-only activities.
          </p>
          <button
            type="button"
            onClick={onOpenDesign}
            className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700"
          >
            Add a cover in Design
          </button>
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {usages.map((usage) => (
            <li key={usage.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="flex h-32 items-center justify-center bg-stone-100">
                {usage.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- teacher-selected media URL
                  <img src={usage.url} alt="" className="h-full w-full object-contain" />
                ) : usage.kind === "audio" ? (
                  <audio src={usage.url} controls className="w-[90%]" />
                ) : usage.kind === "video" ? (
                  <video src={usage.url} controls className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm font-extrabold text-stone-600">PDF</span>
                )}
              </div>
              <div className="flex min-w-0 items-center gap-2 p-3">
                <MediaIcon kind={usage.kind} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-extrabold text-stone-900">
                    {usage.activityLabel}
                  </span>
                  <span className="block truncate text-[10px] font-semibold text-stone-500">
                    {usage.label || usage.kind}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    usage.partId ? onEditActivity(usage.partId) : onOpenDesign()
                  }
                  className="shrink-0 text-xs font-extrabold text-teal-800 underline"
                >
                  Edit
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
