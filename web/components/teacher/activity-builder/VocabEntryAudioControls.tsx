"use client";

import { AudioUrlControls } from "@/components/teacher/media/AudioUrlControls";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined, detail?: { mediaAssetId?: string }) => void;
  libraryQueryHint?: string;
  uploadItemName?: string;
  lexiconId?: string;
};

/** Word audio via the shared teacher media library (upload / pick / record). */
export function VocabEntryAudioControls({
  value,
  onChange,
  libraryQueryHint,
  uploadItemName,
  lexiconId,
}: Props) {
  return (
    <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <AudioUrlControls
        label="Word audio"
        compact
        value={value ?? ""}
        libraryQueryHint={libraryQueryHint}
        uploadItemName={uploadItemName}
        lexiconId={lexiconId}
        onChange={(url, detail) => onChange(url.trim() || undefined, detail)}
      />
      {value ? (
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
          onClick={() => onChange(undefined)}
        >
          Clear audio
        </button>
      ) : null}
    </div>
  );
}
