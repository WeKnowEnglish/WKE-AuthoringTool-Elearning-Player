import { clsx } from "clsx";
import { PET_METER_UI } from "@/lib/pet/meter-ui";
import type { PetMeterId } from "@/lib/pet/types";

type Props = {
  meterId: PetMeterId;
  value: number;
  className?: string;
};

export function PetMeterRing({ meterId, value, className }: Props) {
  const ui = PET_METER_UI[meterId];
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div
      className={clsx("flex flex-col items-center gap-0.5", className)}
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${ui.label} ${pct} percent`}
    >
      <div className="relative h-11 w-11 sm:h-12 sm:w-12">
        <svg
          viewBox="0 0 36 36"
          className="h-full w-full -rotate-90"
          aria-hidden
        >
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className="stroke-kid-ink/15"
            strokeWidth="3.5"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className={clsx(ui.fillClass, "transition-[stroke-dasharray] duration-300")}
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} ${100 - pct}`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums text-kid-ink sm:text-[10px]">
          {pct}
        </span>
      </div>
      <span className="max-w-[3.25rem] text-center text-[9px] font-extrabold uppercase leading-tight tracking-wide text-kid-ink sm:text-[10px]">
        {ui.label}
      </span>
    </div>
  );
}
