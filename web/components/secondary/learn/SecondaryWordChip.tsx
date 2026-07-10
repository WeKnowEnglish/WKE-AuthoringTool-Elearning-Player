"use client";

import clsx from "clsx";
import { SecondaryWordIllustration } from "@/components/secondary/learn/SecondaryWordIllustration";
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
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
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
  imageUrl?: string | null;
  onSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
};

type MetaPart = {
  key: string;
  label: string;
  className: string;
};

function buildChipMetaParts(input: {
  learnStatusLabel: string;
  learnStatusClass: string;
  isFocusHighlight: boolean;
  isNewToday: boolean;
  selectionReason?: string;
}): MetaPart[] {
  const parts: MetaPart[] = [
    {
      key: "status",
      label: input.learnStatusLabel,
      className: input.learnStatusClass,
    },
  ];

  if (input.isFocusHighlight) {
    parts.push({
      key: "focus",
      label: "Focus",
      className: "text-kid-ink/55",
    });
  }

  const reasonLabel = input.isNewToday ? "New" : secondaryStudentReasonLabel(input.selectionReason);
  if (reasonLabel && !(reasonLabel === "New" && input.learnStatusLabel === "New")) {
    parts.push({
      key: "reason",
      label: reasonLabel,
      className: input.isNewToday
        ? "text-sky-800"
        : secondaryStudentReasonChipClass(input.selectionReason ?? ""),
    });
  }

  return parts;
}

function ChipMetaLine({
  parts,
  debugLabel,
  showProgressDots,
  filledDots,
  totalDots,
  compact,
}: {
  parts: MetaPart[];
  debugLabel: string | null;
  showProgressDots: boolean;
  filledDots: number;
  totalDots: number;
  compact?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold leading-tight",
        compact ? "text-xs" : secondaryUi.chipMeta,
      )}
    >
      {parts.map((part, index) => (
        <span key={part.key} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span className="text-kid-ink/35" aria-hidden>·</span> : null}
          <span className={clsx("font-extrabold", part.className)}>{part.label}</span>
        </span>
      ))}
      {showProgressDots ? (
        <SecondaryWordProgressDots
          filledDots={filledDots}
          totalDots={totalDots}
          dotClassName="h-1.5 w-1.5"
          label={`Progress ${filledDots} of ${totalDots}`}
        />
      ) : null}
      {debugLabel ? (
        <span className="font-mono text-[0.65rem] font-bold normal-case text-kid-ink/50">
          [{debugLabel}]
        </span>
      ) : null}
    </div>
  );
}

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
  imageUrl = null,
  onSelect,
}: Props) {
  const item = getSecondaryVocabItemById(wordItemId);
  const snapshot = getSecondaryWordDisplaySnapshot(wordItemId);
  const learnStatus = getSecondaryWordLearnStatusDisplay(snapshot, {
    isFocus: isFocusHighlight,
  });
  const chipClass = secondaryWordLearnChipClassName(learnStatus.status);
  const debugLabel = debugEnabled ? secondaryDebugReasonLabel(selectionReason) : null;
  const metaParts = buildChipMetaParts({
    learnStatusLabel: learnStatus.label,
    learnStatusClass: secondaryWordLearnStatusChipClass(learnStatus.status),
    isFocusHighlight,
    isNewToday,
    selectionReason,
  });

  const isRow = layout === "row";
  const wordLabel = item?.word ?? wordItemId;

  return (
    <button
      type="button"
      data-word-item-id={wordItemId}
      aria-pressed={isSelected}
      onClick={(event) => onSelect(wordItemId, event.currentTarget)}
      className={clsx(
        "border text-left transition-[box-shadow,transform,background-color] duration-150 [touch-action:manipulation] hover:brightness-[0.98] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
        "rounded-lg",
        chipClass,
        isRow ? "min-w-[8rem] shrink-0 snap-start px-2.5 py-2" : "w-full px-2 py-1",
        isFocusHighlight && !isSelected && "!border-2 !border-kid-ink",
        isSelected && "!border-2 !border-sky-700",
      )}
    >
      <div className={clsx("flex min-w-0 items-center gap-2", isRow ? "gap-1.5" : "gap-2")}>
        <div className={clsx("min-w-0 flex-1", isRow ? "flex flex-col gap-0.5" : "flex flex-col gap-0")}>
          <div className="flex min-w-0 items-baseline gap-1.5">
            {!isRow && typeof index === "number" ? (
              <span className="shrink-0 tabular-nums text-xs font-extrabold text-kid-ink/70">
                {index + 1}.
              </span>
            ) : null}
            <span
              className={clsx(
                "min-w-0 truncate font-extrabold leading-tight text-kid-ink",
                secondaryUi.word,
              )}
            >
              {wordLabel}
            </span>
          </div>

          <ChipMetaLine
            parts={metaParts}
            debugLabel={debugLabel}
            showProgressDots={showProgressDots}
            filledDots={learnStatus.filledDots}
            totalDots={learnStatus.totalDots}
            compact={!isRow}
          />
        </div>

        <SecondaryWordIllustration
          imageUrl={imageUrl}
          word={wordLabel}
          size={isRow ? "chipTrailingRow" : "chipTrailing"}
          className="self-center"
        />
      </div>
    </button>
  );
}
