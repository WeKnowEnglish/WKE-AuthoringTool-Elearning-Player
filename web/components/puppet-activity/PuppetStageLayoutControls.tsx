"use client";

import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { playSfx } from "@/lib/audio/sfx";
import {
  clampStageLayout,
  DEFAULT_PUPPET_STAGE_LAYOUT,
  PUPPET_STAGE_OFFSET_MAX,
  PUPPET_STAGE_OFFSET_MIN,
  PUPPET_STAGE_SCALE_MAX,
  PUPPET_STAGE_SCALE_MIN,
  type PuppetStageLayout,
} from "@/lib/puppet-activity/stage-layout";

type Props = {
  layout: PuppetStageLayout;
  onChange: (layout: PuppetStageLayout) => void;
  onReset?: () => void;
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

export function PuppetStageLayoutControls({
  layout,
  onChange,
  onReset,
  muted,
  className,
}: Props) {
  const patch = (partial: Partial<PuppetStageLayout>) => {
    onChange(clampStageLayout({ ...layout, ...partial }));
  };

  const isDefault =
    layout.scale === DEFAULT_PUPPET_STAGE_LAYOUT.scale &&
    layout.offsetX === DEFAULT_PUPPET_STAGE_LAYOUT.offsetX &&
    layout.offsetY === DEFAULT_PUPPET_STAGE_LAYOUT.offsetY;

  return (
    <div
      className={clsx(
        "border-b-2 border-kid-ink/25 bg-[#e8a84a] px-3 py-2 text-kid-ink",
        className,
      )}
      aria-label="Puppet on-screen layout"
    >
      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <Slider
          label="Size"
          value={layout.scale}
          min={PUPPET_STAGE_SCALE_MIN}
          max={PUPPET_STAGE_SCALE_MAX}
          step={0.05}
          suffix="×"
          onChange={(scale) => patch({ scale })}
        />
        <Slider
          label="Position X"
          value={layout.offsetX}
          min={PUPPET_STAGE_OFFSET_MIN}
          max={PUPPET_STAGE_OFFSET_MAX}
          step={1}
          suffix="px"
          onChange={(offsetX) => patch({ offsetX })}
        />
        <Slider
          label="Position Y"
          value={layout.offsetY}
          min={PUPPET_STAGE_OFFSET_MIN}
          max={PUPPET_STAGE_OFFSET_MAX}
          step={1}
          suffix="px"
          onChange={(offsetY) => patch({ offsetY })}
        />
        {onReset ?
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-8 shrink-0 self-end !px-2 text-xs"
            disabled={isDefault}
            onClick={() => {
              playSfx("tap", muted);
              onReset();
            }}
          >
            Reset layout
          </KidButton>
        : null}
      </div>
    </div>
  );
}
