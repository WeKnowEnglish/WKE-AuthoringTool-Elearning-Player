"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";

export function TrackCoverImageEditor(props: {
  value: string;
  onChange: (url: string) => void;
  title: string;
}) {
  return (
    <section className="border-b border-stone-200 bg-amber-50/60 px-4 py-3">
      <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-[9rem_1fr] sm:items-start">
        <div className="h-24 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {props.value ? (
            // eslint-disable-next-line @next/next/no-img-element -- teacher-selected media URL
            <img src={props.value} alt="Track cover preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs font-semibold text-stone-500">
              No custom cover
            </div>
          )}
        </div>
        <div>
          <MediaUrlControls
            label="Cover image"
            value={props.value}
            onChange={(url) => props.onChange(url.trim())}
            compact
            hidePreview
            libraryQueryHint={props.title}
            uploadItemName={`${props.title} cover`}
          />
          {props.value ? (
            <button type="button" onClick={() => props.onChange("")} className="mt-2 text-xs font-bold text-red-700 underline">
              Remove custom cover
            </button>
          ) : (
            <p className="mt-1 text-xs text-stone-600">Choose the image teachers and students see instead of the first vocabulary picture.</p>
          )}
        </div>
      </div>
    </section>
  );
}
