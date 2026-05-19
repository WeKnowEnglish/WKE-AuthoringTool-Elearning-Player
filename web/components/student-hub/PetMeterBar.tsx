import { clsx } from "clsx";
import type { PetMeterId } from "@/lib/pet/types";

const METER_UI: Record<
  PetMeterId,
  { label: string; barClass: string }
> = {
  hunger: { label: "Hunger", barClass: "bg-orange-500" },
  thirst: { label: "Thirst", barClass: "bg-sky-500" },
  energy: { label: "Energy", barClass: "bg-amber-400" },
  cleanliness: { label: "Clean", barClass: "bg-teal-500" },
  happiness: { label: "Happy", barClass: "bg-pink-500" },
};

type Props = {
  meterId: PetMeterId;
  value: number;
  className?: string;
};

export function PetMeterBar({ meterId, value, className }: Props) {
  const ui = METER_UI[meterId];
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="w-16 shrink-0 text-left text-xs font-extrabold uppercase tracking-wide text-kid-ink sm:w-[4.5rem] sm:text-sm">
        {ui.label}
      </span>
      <div
        className="h-4 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-kid-ink bg-white"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${ui.label} ${pct} percent`}
      >
        <div
          className={clsx("h-full rounded-full transition-[width] duration-300", ui.barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-kid-ink/90 sm:text-sm">
        {pct}%
      </span>
    </div>
  );
}
