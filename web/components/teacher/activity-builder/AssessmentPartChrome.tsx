"use client";

import type { AssessmentPart } from "@/lib/assessment/types";

type Props = {
  part: AssessmentPart;
  sectionTitle?: string | null;
  onChange: (next: AssessmentPart) => void;
};

/** Shared title + instructions fields for every assessment part inspector. */
export function AssessmentPartChrome({ part, sectionTitle, onChange }: Props) {
  return (
    <div className="space-y-3">
      {sectionTitle ? (
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
          {sectionTitle}
        </p>
      ) : null}
      <p className="text-[11px] font-semibold capitalize text-stone-500">
        Part {part.partNumber} · {part.kind.replaceAll("_", " ")}
      </p>
      <label className="block text-[11px] font-bold text-stone-700">
        Part title
        <input
          value={part.title}
          onChange={(event) =>
            onChange({ ...part, title: event.target.value })
          }
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold"
        />
      </label>
      <label className="block text-[11px] font-bold text-stone-700">
        Instructions
        <textarea
          value={part.instructions}
          onChange={(event) =>
            onChange({ ...part, instructions: event.target.value })
          }
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
        />
      </label>
    </div>
  );
}
