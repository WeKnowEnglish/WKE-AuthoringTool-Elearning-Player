"use client";

import {
  SOFT_CHROME_PRESETS,
  type SoftChromePresetId,
} from "@/lib/soft-chrome-theme";

type Props = {
  headerBackground: string;
  presetId: SoftChromePresetId;
  onPresetChange: (id: SoftChromePresetId) => void;
};

export function SoftChromePresetSwatches({
  headerBackground,
  presetId,
  onPresetChange,
}: Props) {
  return (
    <div
      className="flex shrink-0 items-center gap-1"
      role="group"
      aria-label="Page background"
    >
      {SOFT_CHROME_PRESETS.map((p) => {
        const selected = p.id === presetId;
        return (
          <button
            key={p.id}
            type="button"
            title={p.label}
            aria-label={p.label}
            aria-pressed={selected}
            onClick={() => onPresetChange(p.id)}
            className={
              selected ?
                "h-5 w-5 rounded-full ring-2 ring-neutral-700 ring-offset-2"
              : "h-5 w-5 rounded-full ring-1 ring-black/15 transition hover:ring-black/30"
            }
            style={{
              backgroundColor: p.page,
              ["--tw-ring-offset-color" as string]: headerBackground,
            }}
          />
        );
      })}
    </div>
  );
}
