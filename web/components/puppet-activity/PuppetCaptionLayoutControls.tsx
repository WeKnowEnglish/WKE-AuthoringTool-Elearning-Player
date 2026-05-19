"use client";

import { clsx } from "clsx";
import { useCallback } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import {
  CAPTION_ROLES,
  CAPTION_SCALE_MAX,
  CAPTION_SCALE_MIN,
  CAPTION_SIZES,
  CAPTION_WIDTH_PERCENT_MAX,
  CAPTION_WIDTH_PERCENT_MIN,
  CAPTION_X_PERCENT_MAX,
  CAPTION_X_PERCENT_MIN,
  CAPTION_Y_PERCENT_MAX,
  CAPTION_Y_PERCENT_MIN,
  CAPTION_ROLE_PRESETS,
  clampCaptionLayout,
  formatLineBeatSnippet,
  resolveCaptionLayout,
  type PuppetCaptionLayout,
  type PuppetCaptionRole,
  type PuppetCaptionSize,
} from "@/lib/puppet-activity/caption-layout";
import type { PuppetLineBeat, PuppetScript } from "@/lib/puppet-activity/types";

type LineBeatOption = { beatIndex: number; label: string; beat: PuppetLineBeat };

type Props = {
  script: PuppetScript;
  lineBeats: LineBeatOption[];
  editingBeatIndex: number;
  onEditingBeatIndexChange: (beatIndex: number) => void;
  overrides: Partial<Record<number, PuppetCaptionLayout>>;
  onOverrideChange: (beatIndex: number, layout: PuppetCaptionLayout) => void;
  onClearOverride: (beatIndex: number) => void;
  muted: boolean;
  className?: string;
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs font-bold text-kid-ink">
      <span className="flex justify-between gap-1">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums">
          {step < 1 ? value.toFixed(2) : Math.round(value)}
          {suffix ?? ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full accent-kid-ink"
      />
    </label>
  );
}

export function PuppetCaptionLayoutControls({
  script,
  lineBeats,
  editingBeatIndex,
  onEditingBeatIndexChange,
  overrides,
  onOverrideChange,
  onClearOverride,
  muted,
  className,
}: Props) {
  const editing = lineBeats.find((lb) => lb.beatIndex === editingBeatIndex);
  const beat = editing?.beat;
  const layout =
    beat ?
      resolveCaptionLayout(beat, script, editingBeatIndex, overrides)
    : clampCaptionLayout({ xPercent: 50, yPercent: 78 });

  const patch = useCallback(
    (partial: Partial<PuppetCaptionLayout>) => {
      onOverrideChange(editingBeatIndex, clampCaptionLayout({ ...layout, ...partial }));
    },
    [editingBeatIndex, layout, onOverrideChange],
  );

  const copySnippet = useCallback(async () => {
    if (!beat) return;
    const text = formatLineBeatSnippet(beat, layout);
    try {
      await navigator.clipboard.writeText(text);
      playSfx("complete", muted);
    } catch {
      playSfx("wrong", muted);
    }
  }, [beat, layout, muted]);

  const applyRole = useCallback(
    (role: PuppetCaptionRole) => {
      const preset = CAPTION_ROLE_PRESETS[role];
      patch({ role, ...preset });
    },
    [patch],
  );

  if (lineBeats.length === 0) return null;

  return (
    <div
      className={clsx(
        "border-b-2 border-kid-ink/25 bg-[#c5e1a5] px-3 py-2 text-kid-ink",
        className,
      )}
      aria-label="Caption layout for script lines"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-xs font-bold">
          <span className="shrink-0 uppercase tracking-wide">Line</span>
          <select
            aria-label="Select line beat to edit caption layout"
            value={editingBeatIndex}
            onChange={(e) => {
              playSfx("tap", muted);
              onEditingBeatIndexChange(Number(e.target.value));
            }}
            className="max-w-[12rem] truncate rounded-md border-2 border-kid-ink bg-white px-2 py-1 text-xs font-bold shadow-[2px_2px_0_#152668]"
          >
            {lineBeats.map((lb) => (
              <option key={lb.beatIndex} value={lb.beatIndex}>
                {lb.label}
              </option>
            ))}
          </select>
        </label>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-8 !px-2 text-xs"
          disabled={overrides[editingBeatIndex] == null}
          onClick={() => {
            playSfx("tap", muted);
            onClearOverride(editingBeatIndex);
          }}
        >
          Use script only
        </KidButton>
        <KidButton
          type="button"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => void copySnippet()}
        >
          Copy for script
        </KidButton>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-xs font-bold">
          <span className="shrink-0">Role</span>
          <select
            aria-label="Caption role preset"
            value={layout.role ?? ""}
            onChange={(e) => {
              playSfx("tap", muted);
              const v = e.target.value;
              if (v === "") patch({ role: undefined });
              else applyRole(v as PuppetCaptionRole);
            }}
            className="rounded-md border-2 border-kid-ink bg-white px-2 py-1 text-xs font-bold"
          >
            <option value="">Custom</option>
            {CAPTION_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs font-bold">
          <span className="shrink-0">Text</span>
          <select
            aria-label="Caption text size"
            value={layout.size ?? "lg"}
            onChange={(e) => {
              playSfx("tap", muted);
              patch({ size: e.target.value as PuppetCaptionSize });
            }}
            className="rounded-md border-2 border-kid-ink bg-white px-2 py-1 text-xs font-bold"
          >
            {CAPTION_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs font-bold">
          <input
            type="checkbox"
            checked={layout.showPanel !== false}
            onChange={(e) => {
              playSfx("tap", muted);
              patch({ showPanel: e.target.checked });
            }}
            className="size-4 accent-kid-ink"
          />
          Panel
        </label>
        {beat?.persist ?
          <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold uppercase">
            persist
            {beat.group ? ` · ${beat.group}` : ""}
          </span>
        : null}
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2 sm:gap-3">
        <Slider
          label="Caption X"
          value={layout.xPercent}
          min={CAPTION_X_PERCENT_MIN}
          max={CAPTION_X_PERCENT_MAX}
          step={1}
          suffix="%"
          onChange={(xPercent) => patch({ xPercent })}
        />
        <Slider
          label="Caption Y"
          value={layout.yPercent}
          min={CAPTION_Y_PERCENT_MIN}
          max={CAPTION_Y_PERCENT_MAX}
          step={1}
          suffix="%"
          onChange={(yPercent) => patch({ yPercent })}
        />
        <Slider
          label="Box scale"
          value={layout.scale ?? 1}
          min={CAPTION_SCALE_MIN}
          max={CAPTION_SCALE_MAX}
          step={0.05}
          suffix="×"
          onChange={(scale) => patch({ scale })}
        />
        <Slider
          label="Width"
          value={layout.widthPercent ?? 88}
          min={CAPTION_WIDTH_PERCENT_MIN}
          max={CAPTION_WIDTH_PERCENT_MAX}
          step={1}
          suffix="%"
          onChange={(widthPercent) => patch({ widthPercent })}
        />
      </div>
    </div>
  );
}
