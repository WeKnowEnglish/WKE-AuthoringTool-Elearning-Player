import clsx from "clsx";
import { SecondaryWordProgressDots } from "@/components/secondary/learn/SecondaryWordProgressDots";
import {
  getSecondaryWordLearnStatusDisplay,
  secondaryWordLearnStatusChipClass,
} from "@/lib/secondary/secondary-learn-display";
import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";

type Props = {
  snapshot: SecondaryWordDisplaySnapshot;
  isFocus?: boolean;
};

export function SecondaryWordProgressBadge({ snapshot, isFocus }: Props) {
  const display = getSecondaryWordLearnStatusDisplay(snapshot, { isFocus });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={clsx(
          "text-xs font-extrabold uppercase tracking-wide",
          secondaryWordLearnStatusChipClass(display.status),
        )}
      >
        {display.label} word
      </span>
      <SecondaryWordProgressDots
        filledDots={display.filledDots}
        totalDots={display.totalDots}
        label={`Progress ${display.filledDots} of ${display.totalDots}`}
      />
    </div>
  );
}
