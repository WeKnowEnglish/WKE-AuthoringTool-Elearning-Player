"use client";

import { AudioClipControls } from "@/components/teacher/activity-builder/AudioClipControls";

type Props = {
  audioText: string;
  audioUrl?: string;
  onChange: (next: { audioText: string; audioUrl?: string }) => void;
  /** Optional label override for the clip control. */
  clipLabel?: string;
};

/** Shared listening authoring: script (TTS fallback) + media-library clip. */
export function AssessmentListeningAudioFields({
  audioText,
  audioUrl,
  onChange,
  clipLabel = "Listening audio",
}: Props) {
  return (
    <div className="space-y-2">
      <AudioClipControls
        label={clipLabel}
        hint="Upload, record, or pick from the media library. When set, students hear this instead of TTS."
        value={audioUrl ?? ""}
        onChange={(url) =>
          onChange({
            audioText,
            audioUrl: url.trim() ? url.trim() : undefined,
          })
        }
      />
      <label className="block text-[11px] font-bold text-stone-700">
        Audio script (TTS fallback)
        <textarea
          value={audioText}
          onChange={(event) =>
            onChange({
              audioText: event.target.value,
              ...(audioUrl ? { audioUrl } : {}),
            })
          }
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-stone-300 px-2 py-1.5 text-xs font-semibold leading-5"
        />
      </label>
    </div>
  );
}
