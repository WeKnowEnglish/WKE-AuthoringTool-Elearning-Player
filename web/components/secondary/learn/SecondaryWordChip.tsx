"use client";

import clsx from "clsx";
import { SecondaryWordProgressDots } from "@/components/secondary/learn/SecondaryWordProgressDots";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import {
  getSecondaryWordLearnStatusDisplay,
  secondaryWordLearnChipClassName,
  secondaryWordLearnStatusChipClass,
} from "@/lib/secondary/secondary-learn-display";
import {
  secondaryDebugReasonLabel,
  secondaryStudentReasonChipClass,
  secondaryStudentReasonLabel,
} from "@/lib/secondary/secondary-selection-reason-labels";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

export type SecondaryWordChipLayout = "sidebar" | "row";

type Props = {
  wordItemId: string;
  layout: SecondaryWordChipLayout;
  index?: number;
  isFocusHighlight: boolean;
  isSelected: boolean;
  isNewToday: boolean;
  selectionReason?: string;
  debugEnabled?: boolean;
  showProgressDots?: boolean;
  onSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
};

export function SecondaryWordChip({
  wordItemId,
  layout,
  index,
  isFocusHighlight,
  isSelected,
  isNewToday,
  selectionReason,
  debugEnabled = false,
  showProgressDots = false,
  onSelect,
}: Props) {
  const item = getSecondaryVocabItemById(wordItemId);
  const snapshot = getSecondaryWordDisplaySnapshot(wordItemId);
  const learnStatus = getSecondaryWordLearnStatusDisplay(snapshot, {
    isFocus: isFocusHighlight,
  });
  const chipClass = secondaryWordLearnChipClassName(learnStatus.status);
  const studentLabel = isNewToday ? "New today" : secondaryStudentReasonLabel(selectionReason);
  const debugLabel = debugEnabled ? secondaryDebugReasonLabel(selectionReason) : null;

  const isRow = layout === "row";

  return (
    <button
      type="button"
      data-word-item-id={wordItemId}
      aria-pressed={isSelected}
      onClick={(event) => onSelect(wordItemId, event.currentTarget)}
      className={clsx(
        "rounded-lg border text-left transition-[box-shadow,transform] duration-150 [touch-action:manipulation] hover:brightness-[0.98] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
        chipClass,
        isRow ? "min-w-[7.75rem] shrink-0 snap-start px-3 py-2" : "w-full px-2 py-1",
        isFocusHighlight && !isSelected && "!border-2 !border-kid-ink",
        isSelected && "!border-2 !border-sky-700",
      )}
    >
      <div className={clsx("flex", isRow ? "flex-col gap-1" : "items-baseline gap-1.5")}>
        {!isRow && typeof index === "number" ? (
          <span className="shrink-0 tabular-nums text-sm font-extrabold opacity-80">
            {index + 1}.
          </span>
        ) : null}
        <span
          className={clsx(
            "min-w-0 font-extrabold leading-tight text-kid-ink",
            isRow ? "text-sm" : "text-base",
          )}
        >
          {item?.word ?? wordItemId}
        </span>
      </div>

      <div
        className={clsx(
          "font-semibold leading-tight",
          isRow ? "mt-1 space-y-1" : "mt-0.5 text-xs opacity-90",
        )}
      >
        <div className={clsx("flex flex-wrap items-center gap-1.5", isRow && "text-[0.65rem]")}>
          <span className={secondaryWordLearnStatusChipClass(learnStatus.status)}>
            {learnStatus.label}
          </span>
          {showProgressDots ? (
            <SecondaryWordProgressDots
              filledDots={learnStatus.filledDots}
              totalDots={learnStatus.totalDots}
              dotClassName="h-1.5 w-1.5"
              label={`Progress ${learnStatus.filledDots} of ${learnStatus.totalDots}`}
            />
          ) : null}
        </div>

        {!isRow ? (
          <p className="text-xs">
            {isFocusHighlight ? (
              <span className="font-extrabold uppercase tracking-wide opacity-80">· Focus</span>
            ) : null}
            {studentLabel ? (
              <span
                className={clsx(
                  "ml-1.5 font-extrabold uppercase tracking-wide opacity-90",
                  isNewToday ? "text-sky-800" : secondaryStudentReasonChipClass(selectionReason ?? ""),
                )}
              >
                · {studentLabel}
              </span>
            ) : null}
            {debugLabel ? (
              <span className="ml-1.5 font-mono text-[0.6rem] font-bold normal-case text-kid-ink/50">
                [{debugLabel}]
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </button>
  );
}
