"use client";

import { clsx } from "clsx";
import { playSfx } from "@/lib/audio/sfx";
import {
  PUPPET_ANIMATION_OPTIONS,
  labelForPuppetAnimation,
} from "@/lib/puppet-activity/puppet-animation-catalog";
import type { PuppetAnimationId } from "@/lib/puppet-activity/types";

type Props = {
  value: PuppetAnimationId;
  onChange: (id: PuppetAnimationId) => void;
  muted: boolean;
  className?: string;
  /** Show compact label on narrow screens */
  compact?: boolean;
};

export function PuppetAnimationSelect({
  value,
  onChange,
  muted,
  className,
  compact = false,
}: Props) {
  return (
    <label
      className={clsx(
        "flex min-w-0 items-center gap-1.5 text-xs font-bold text-kid-ink",
        className,
      )}
    >
      <span className={clsx("shrink-0 uppercase tracking-wide", compact && "sr-only sm:not-sr-only")}>
        Gesture
      </span>
      <select
        value={value}
        aria-label="Preset animation"
        title={labelForPuppetAnimation(value)}
        onChange={(e) => {
          playSfx("tap", muted);
          onChange(e.target.value as PuppetAnimationId);
        }}
        className="max-w-[8.5rem] min-w-0 flex-1 truncate rounded-md border-2 border-kid-ink bg-white px-2 py-1.5 text-xs font-bold text-kid-ink shadow-[2px_2px_0_#152668] focus:outline-none focus:ring-2 focus:ring-[#ffe135]"
      >
        {PUPPET_ANIMATION_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
