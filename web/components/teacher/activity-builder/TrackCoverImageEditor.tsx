"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";

export function TrackCoverImageEditor(props: {
  value: string;
  onChange: (url: string) => void;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
        {props.value ? (
          // eslint-disable-next-line @next/next/no-img-element -- teacher-selected media URL
          <img src={props.value} alt="Track cover preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-[11px] font-semibold text-stone-500">
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
          <p className="mt-1 text-[11px] leading-snug text-stone-500">
            Used on activity cards instead of the first vocabulary picture.
          </p>
        )}
      </div>
    </div>
  );
}
