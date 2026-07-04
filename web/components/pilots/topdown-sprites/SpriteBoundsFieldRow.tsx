"use client";

import type { BoundsField } from "@/lib/topdown/bounds-editor-utils";

type Props = {
  field: BoundsField;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onBump: (delta: number) => void;
};

function StepButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-kid-ink bg-kid-panel text-sm font-bold text-kid-ink hover:bg-kid-surface-muted"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function SpriteBoundsFieldRow({
  field,
  label,
  value,
  min,
  max,
  onChange,
  onBump,
}: Props) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[3rem_1fr_auto]">
      <span className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        <StepButton onClick={() => onBump(-10)} ariaLabel={`Decrease ${field} by 10`}>
          ⏪
        </StepButton>
        <StepButton onClick={() => onBump(-1)} ariaLabel={`Decrease ${field} by 1`}>
          ◀
        </StepButton>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-0 flex-1 accent-kid-cta"
          aria-label={`${label} slider`}
        />
        <StepButton onClick={() => onBump(1)} ariaLabel={`Increase ${field} by 1`}>
          ▶
        </StepButton>
        <StepButton onClick={() => onBump(10)} ariaLabel={`Increase ${field} by 10`}>
          ⏩
        </StepButton>
      </div>
      <span className="w-12 text-right font-mono text-sm font-bold text-kid-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}
