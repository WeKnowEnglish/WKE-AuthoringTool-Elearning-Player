"use client";

import clsx from "clsx";
import type { SpeakSyllableMode } from "@/lib/audio/speak-syllables";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type Props = {
  mode: SpeakSyllableMode;
  disabled?: boolean;
  onChange: (mode: SpeakSyllableMode) => void;
};

const OPTIONS: Array<{ id: SpeakSyllableMode; label: string }> = [
  { id: "normal", label: "Normal" },
  { id: "slow", label: "Slow" },
];

export function SecondarySyllableSpeechSpeedToggle({ mode, disabled = false, onChange }: Props) {
  return (
    <div
      className="inline-flex rounded-lg border-2 border-kid-ink/25 bg-kid-panel/50 p-0.5"
      role="group"
      aria-label="Speech speed"
    >
      {OPTIONS.map((option) => {
        const selected = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={clsx(
              `rounded-md px-3 py-1.5 ${secondaryUi.caption} font-extrabold transition-[background-color,box-shadow,color] [touch-action:manipulation]`,
              selected ?
                "bg-white text-kid-ink shadow-sm"
              : "text-kid-ink/70 hover:text-kid-ink",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
