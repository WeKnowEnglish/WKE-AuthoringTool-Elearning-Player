"use client";

import { SecondaryWordChip } from "@/components/secondary/learn/SecondaryWordChip";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type WordListSectionProps = {
  title: string;
  wordItemIds: string[];
  focusWordItemIds: ReadonlySet<string>;
  newTodayWordItemIds: ReadonlySet<string>;
  selectionReasons: Record<string, string>;
  debugEnabled: boolean;
  selectedWordItemId: string | null;
  onWordSelect: (wordItemId: string, trigger: HTMLButtonElement) => void;
};

function WordListSection({
  title,
  wordItemIds,
  focusWordItemIds,
  newTodayWordItemIds,
  selectionReasons,
  debugEnabled,
  selectedWordItemId,
  onWordSelect,
}: WordListSectionProps) {
  if (wordItemIds.length === 0) return null;

  return (
    <div className="border-t-2 border-kid-ink/10 first:border-t-0">
      <p className={`px-3 pb-1 pt-2 ${secondaryUi.eyebrowMuted}`}>{title}</p>
      <ol className="space-y-1 px-1.5 pb-1.5">
        {wordItemIds.map((wordItemId, index) => (
          <li key={wordItemId}>
            <SecondaryWordChip
              wordItemId={wordItemId}
              layout="sidebar"
              index={index}
              isFocusHighlight={focusWordItemIds.has(wordItemId)}
              isSelected={selectedWordItemId === wordItemId}
              isNewToday={newTodayWordItemIds.has(wordItemId)}
              selectionReason={selectionReasons[wordItemId]}
              debugEnabled={debugEnabled}
              onSelect={onWordSelect}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

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

export function SecondaryFocusWordsPanel({
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
  const warmUpTitle =
    warmUpWordItemIds.length > 0
      ? `Warm-up (${warmUpWordItemIds.length})`
      : "Warm-up";
  const focusTitle =
    focusWordItemIds.length > 0
      ? `Focus (${focusWordItemIds.length})`
      : "Focus";

  return (
    <aside
      className="hidden w-full shrink-0 flex-col overflow-hidden rounded-xl border-2 border-kid-ink bg-white lg:flex lg:w-60 xl:w-64"
      aria-label="Today's vocabulary list"
      {...(inert ? { inert: true } : {})}
    >
      <div className="shrink-0 rounded-t-xl border-b-2 border-kid-ink/15 bg-kid-panel px-3 py-2.5">
        <p className={secondaryUi.eyebrow}>Today&apos;s words</p>
        <p className={`mt-0.5 ${secondaryUi.captionMuted}`}>
          Tap a word to open the helper · warm-up first, then focus
        </p>
      </div>

      <div>
        {!hydrated ? (
          <ul className="space-y-1 p-1.5" aria-hidden>
            {Array.from({ length: 10 }).map((_, index) => (
              <li
                key={index}
                className="h-10 animate-pulse rounded-lg border border-kid-ink/15 bg-kid-panel/60"
              />
            ))}
          </ul>
        ) : (
          <>
            <WordListSection
              title={warmUpTitle}
              wordItemIds={warmUpWordItemIds}
              focusWordItemIds={focusHighlightWordIds}
              newTodayWordItemIds={newTodaySet}
              selectionReasons={selectionReasons}
              debugEnabled={debugEnabled}
              selectedWordItemId={selectedWordItemId}
              onWordSelect={onWordSelect ?? (() => {})}
            />
            <WordListSection
              title={focusTitle}
              wordItemIds={focusWordItemIds}
              focusWordItemIds={focusHighlightWordIds}
              newTodayWordItemIds={newTodaySet}
              selectionReasons={selectionReasons}
              debugEnabled={debugEnabled}
              selectedWordItemId={selectedWordItemId}
              onWordSelect={onWordSelect ?? (() => {})}
            />
          </>
        )}
      </div>
    </aside>
  );
}
