"use client";

import { useRef, useState } from "react";
import {
  publishVocabStudioAsset,
  readAudioFileAsDataUrl,
} from "@/lib/activity-builder/vocabulary-list";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  cloudMeta?: Record<string, unknown>;
};

/** Simple upload / URL / clear controls for vocabulary entry audio. */
export function VocabEntryAudioControls({ value, onChange, cloudMeta }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-stone-800">Word audio</h3>
        {value?.startsWith("data:") ? (
          <span className="text-xs text-emerald-800">Local audio</span>
        ) : null}
        {value?.startsWith("http") ? (
          <span className="text-xs text-sky-800">Cloud URL</span>
        ) : null}
      </div>
      <p className="text-xs text-stone-500">
        Upload a clip now (mic recording lands with quiz audio tools later). Cloud
        publish uses your teacher session.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Working…" : "Choose audio file"}
        </button>
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
      <label className="block text-xs text-stone-500">
        Or paste audio URL
        <input
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900"
          placeholder="https://…"
          value={value?.startsWith("data:") ? "" : (value ?? "")}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      </label>
      {value?.trim() ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls src={value} className="w-full max-w-md" />
      ) : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const dataUrl = await readAudioFileAsDataUrl(file);
            try {
              const published = await publishVocabStudioAsset({
                file,
                filename: file.name || "vocab-audio.webm",
                kind: "audio",
                meta: cloudMeta,
              });
              onChange(published.public_url);
            } catch {
              onChange(dataUrl);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not import audio.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
