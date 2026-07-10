import clsx from "clsx";
import { SecondaryWordProgressDots } from "@/components/secondary/learn/SecondaryWordProgressDots";
import {
  getSecondaryWordLearnStatusDisplay,
  secondaryWordLearnStatusChipClass,
} from "@/lib/secondary/secondary-learn-display";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import type { SecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";

type Props = {
  snapshot: SecondaryWordDisplaySnapshot;
  isFocus?: boolean;
  centered?: boolean;
};

export function SecondaryWordProgressBadge({ snapshot, isFocus, centered = false }: Props) {
  const display = getSecondaryWordLearnStatusDisplay(snapshot, { isFocus });

  return (
    <div className={clsx("flex flex-wrap items-center gap-2", centered && "justify-center")}>
      <span
        className={clsx(
          secondaryUi.tag,
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
