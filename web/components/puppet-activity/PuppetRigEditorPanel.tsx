"use client";

import { useCallback, useMemo } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import {
  buildRigExportBundle,
  clampMotionTune,
  formatPartMotionForSource,
  formatRigExportJson,
  formatRigExportMarkdown,
  PART_MOTION_SPEED_MAX,
  PART_MOTION_SPEED_MIN,
  type PartMotionTune,
} from "@/lib/puppet-activity/part-motion-tune";
import {
  formatPivotsOnlyForSource,
  pivotMapToRigPivots,
  PUPPET_PART_LABELS,
  type PivotPercent,
} from "@/lib/puppet-activity/pivot-utils";
import { PUPPET_RIG_PRESETS } from "@/lib/puppet-activity/presets";
import { PUPPET_PART_KEYS, type PuppetPartKey } from "@/lib/puppet-activity/types";

type Props = {
  pivots: Record<PuppetPartKey, PivotPercent>;
  partMotion: Record<PuppetPartKey, PartMotionTune>;
  selectedPart: PuppetPartKey;
  onSelectPart: (part: PuppetPartKey) => void;
  onPivotChange: (part: PuppetPartKey, pivot: PivotPercent) => void;
  onMotionChange: (part: PuppetPartKey, tune: PartMotionTune) => void;
  onResetPart: (part: PuppetPartKey) => void;
  onResetAll: () => void;
  onLoadRigPreset?: (presetId: string) => void;
  muted: boolean;
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
    <label className="flex flex-col gap-0.5 text-xs font-bold text-kid-ink">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="tabular-nums">
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-kid-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-kid-ink"
      />
      {label}
    </label>
  );
}

export function PuppetRigEditorPanel({
  pivots,
  partMotion,
  selectedPart,
  onSelectPart,
  onPivotChange,
  onMotionChange,
  onResetPart,
  onResetAll,
  onLoadRigPreset,
  muted,
}: Props) {
  const pivot = pivots[selectedPart];
  const motion = partMotion[selectedPart];

  const exportBundle = useMemo(
    () => buildRigExportBundle(pivots, partMotion),
    [pivots, partMotion],
  );

  const copyText = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        playSfx("complete", muted);
      } catch {
        playSfx("wrong", muted);
      }
    },
    [muted],
  );

  const updateMotion = (patch: Partial<PartMotionTune>) => {
    onMotionChange(selectedPart, clampMotionTune({ ...motion, ...patch }));
  };

  return (
    <div
      className="max-h-[min(42vh,320px)] shrink-0 overflow-y-auto border-b-4 border-kid-ink bg-[#fff8e1] px-3 py-2 text-kid-ink"
      aria-label="Puppet rig editor"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-kid-ink/80">
        Rig tools — only the selected piece animates while this panel is open
      </p>

      {onLoadRigPreset && PUPPET_RIG_PRESETS.length > 0 ?
        <label className="mt-2 flex min-w-0 items-center gap-2 text-xs font-bold text-kid-ink">
          <span className="shrink-0 uppercase tracking-wide">Rig preset</span>
          <select
            aria-label="Load rig preset"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              playSfx("tap", muted);
              onLoadRigPreset(id);
              e.target.value = "";
            }}
            className="min-w-0 flex-1 truncate rounded-md border-2 border-kid-ink bg-white px-2 py-1.5 text-xs font-bold text-kid-ink shadow-[2px_2px_0_#152668] focus:outline-none focus:ring-2 focus:ring-[#ffe135]"
          >
            <option value="">Load preset…</option>
            {PUPPET_RIG_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {PUPPET_PART_KEYS.map((part) => (
          <button
            key={part}
            type="button"
            onClick={() => {
              playSfx("tap", muted);
              onSelectPart(part);
            }}
            className={`rounded-md border-2 border-kid-ink px-2 py-0.5 text-xs font-extrabold ${
              selectedPart === part ?
                "bg-[#f5a623] text-kid-ink"
              : "bg-white/80 text-kid-ink hover:bg-white"
            }`}
          >
            {PUPPET_PART_LABELS[part]}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[10px] font-bold uppercase text-kid-ink/70">Pivot</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <Slider
          label="Pivot X"
          value={pivot.x}
          min={0}
          max={100}
          step={0.5}
          suffix="%"
          onChange={(x) => onPivotChange(selectedPart, { ...pivot, x })}
        />
        <Slider
          label="Pivot Y"
          value={pivot.y}
          min={0}
          max={100}
          step={0.5}
          suffix="%"
          onChange={(y) => onPivotChange(selectedPart, { ...pivot, y })}
        />
      </div>

      <p className="mt-3 text-[10px] font-bold uppercase text-kid-ink/70">Motion</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <Toggle
          label="Rotate at pivot"
          checked={motion.rotateEnabled}
          onChange={(rotateEnabled) => updateMotion({ rotateEnabled })}
        />
        <Toggle
          label="Translate (bob)"
          checked={motion.translateEnabled}
          onChange={(translateEnabled) => updateMotion({ translateEnabled })}
        />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Slider
          label="Speed"
          value={motion.speed}
          min={PART_MOTION_SPEED_MIN}
          max={PART_MOTION_SPEED_MAX}
          step={0.05}
          suffix="×"
          onChange={(speed) => updateMotion({ speed })}
        />
        <Slider
          label="Bob (px)"
          value={motion.translateMaxPx}
          min={0}
          max={24}
          step={1}
          suffix="px"
          onChange={(translateMaxPx) => updateMotion({ translateMaxPx })}
        />
        <Slider
          label="Rotate min"
          value={motion.rotateMinDeg}
          min={-45}
          max={45}
          step={1}
          suffix="°"
          onChange={(rotateMinDeg) => updateMotion({ rotateMinDeg })}
        />
        <Slider
          label="Rotate max"
          value={motion.rotateMaxDeg}
          min={-45}
          max={45}
          step={1}
          suffix="°"
          onChange={(rotateMaxDeg) => updateMotion({ rotateMaxDeg })}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => {
            playSfx("tap", muted);
            onResetPart(selectedPart);
          }}
        >
          Reset part
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => {
            playSfx("tap", muted);
            onResetAll();
          }}
        >
          Reset all
        </KidButton>
      </div>

      <p className="mt-3 text-[10px] font-bold uppercase text-kid-ink/70">Export</p>
      <div className="mt-1 flex flex-wrap gap-2">
        <KidButton
          type="button"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => void copyText(formatRigExportJson(exportBundle))}
        >
          Copy full JSON
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => void copyText(formatRigExportMarkdown(exportBundle))}
        >
          Copy for chat
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-8 !px-2 text-xs"
          onClick={() =>
            void copyText(formatPivotsOnlyForSource(pivotMapToRigPivots(pivots)))
          }
        >
          Copy pivots only
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => void copyText(formatPartMotionForSource(partMotion))}
        >
          Copy motion only
        </KidButton>
      </div>
    </div>
  );
}
