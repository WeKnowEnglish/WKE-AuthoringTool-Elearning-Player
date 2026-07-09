"use client";

import { SecondaryWordChip } from "@/components/secondary/learn/SecondaryWordChip";

type Props = {
  hydrated: boolean;
  hasWordsToday: boolean;
  warmUpWordItemIds: string[];
  focusWordItemIds: string[];
  focusHighlightWordIds: ReadonlySet<string>;
  newTodayWordItemIds?: ReadonlySet<string>;
  selectionReasons?: Record<string, string>;
  debugEnabled?: boolean;
  selectedWordItemId?: string | null;
  onWordSelect?: (wordItemId: string, trigger: HTMLButtonElement) => void;
  inert?: boolean;
};

function ChipSection({
  title,
  wordItemIds,
  focusHighlightWordIds,
  newTodayWordItemIds,
  selectionReasons,
  debugEnabled,
  selectedWordItemId,
  onWordSelect,
}: {
  title: string;
  wordItemIds: string[];
  focusHighlightWordIds: ReadonlySet<string>;
  newTodayWordItemIds: ReadonlySet<string>;
  selectionReasons: Record<string, string>;
  debugEnabled: boolean;
  selectedWordItemId: string | null;
  onWordSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
}) {
  if (wordItemIds.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="shrink-0 text-[0.6rem] font-extrabold uppercase tracking-wide text-kid-ink/50">
        {title}
      </span>
      <div className="flex gap-2">
        {wordItemIds.map((wordItemId) => (
          <SecondaryWordChip
            key={wordItemId}
            wordItemId={wordItemId}
            layout="row"
            isFocusHighlight={focusHighlightWordIds.has(wordItemId)}
            isSelected={selectedWordItemId === wordItemId}
            isNewToday={newTodayWordItemIds.has(wordItemId)}
            selectionReason={selectionReasons[wordItemId]}
            debugEnabled={debugEnabled}
            showProgressDots
            onSelect={onWordSelect}
          />
        ))}
      </div>
    </div>
  );
}

export function SecondaryFocusWordRow({
  hydrated,
  hasWordsToday,
  warmUpWordItemIds,
  focusWordItemIds,
  focusHighlightWordIds,
  newTodayWordItemIds,
  selectionReasons = {},
  debugEnabled = false,
  selectedWordItemId = null,
  onWordSelect,
  inert = false,
}: Props) {
  if (hydrated && !hasWordsToday) return null;

  const newTodaySet = newTodayWordItemIds ?? new Set<string>();
  const handleSelect = onWordSelect ?? (() => {});

  return (
    <section
      className="mb-4 overflow-hidden rounded-xl border-2 border-kid-ink bg-white lg:hidden"
      aria-label="Today's vocabulary chips"
      {...(inert ? { inert: true } : {})}
    >
      <div className="rounded-t-xl border-b-2 border-kid-ink/15 bg-kid-panel px-3 py-2">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
          Today&apos;s words
        </p>
        <p className="mt-0.5 text-[0.65rem] font-semibold text-kid-ink/60">
          Tap a word for the helper · warm-up then focus
        </p>
      </div>

      {!hydrated ? (
        <div className="flex gap-2 overflow-hidden p-3" aria-hidden>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 min-w-[7.75rem] shrink-0 animate-pulse rounded-lg border border-kid-ink/15 bg-kid-panel/60"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto p-3 [scrollbar-width:thin] snap-x snap-mandatory">
          <ChipSection
            title="Warm-up"
            wordItemIds={warmUpWordItemIds}
            focusHighlightWordIds={focusHighlightWordIds}
            newTodayWordItemIds={newTodaySet}
            selectionReasons={selectionReasons}
            debugEnabled={debugEnabled}
            selectedWordItemId={selectedWordItemId}
            onWordSelect={handleSelect}
          />
          <ChipSection
            title="Focus"
            wordItemIds={focusWordItemIds}
            focusHighlightWordIds={focusHighlightWordIds}
            newTodayWordItemIds={newTodaySet}
            selectionReasons={selectionReasons}
            debugEnabled={debugEnabled}
            selectedWordItemId={selectedWordItemId}
            onWordSelect={handleSelect}
          />
        </div>
      )}
    </section>
  );
}
