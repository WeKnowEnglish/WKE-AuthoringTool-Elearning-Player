"use client";

import clsx from "clsx";
import { SecondaryWordChip } from "@/components/secondary/learn/SecondaryWordChip";
import { useScrollRevealScrollbar } from "@/lib/hooks/use-scroll-reveal-scrollbar";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type WordListSectionProps = {
  title: string;
  wordItemIds: string[];
  focusWordItemIds: ReadonlySet<string>;
  newTodayWordItemIds: ReadonlySet<string>;
  selectionReasons: Record<string, string>;
  imageUrlsByWordId?: Record<string, string | null>;
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
  imageUrlsByWordId = {},
  debugEnabled,
  selectedWordItemId,
  onWordSelect,
}: WordListSectionProps) {
  if (wordItemIds.length === 0) return null;

  return (
    <div className="border-t-2 border-sec-ink/10 first:border-t-0">
      <p className={`px-3 pb-1 pt-2 ${secondaryUi.eyebrowMuted}`}>{title}</p>
      <ol className="space-y-0.5 px-1.5 pb-2">
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
              imageUrl={imageUrlsByWordId[wordItemId] ?? null}
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
  imageUrlsByWordId?: Record<string, string | null>;
  debugEnabled?: boolean;
  selectedWordItemId?: string | null;
  onWordSelect?: (wordItemId: string, trigger: HTMLButtonElement) => void;
  inert?: boolean;
  embedded?: boolean;
};

export function SecondaryFocusWordsPanel({
  hydrated,
  hasWordsToday,
  warmUpWordItemIds,
  focusWordItemIds,
  focusHighlightWordIds,
  newTodayWordItemIds,
  selectionReasons = {},
  imageUrlsByWordId = {},
  debugEnabled = false,
  selectedWordItemId = null,
  onWordSelect,
  inert = false,
  embedded = false,
}: Props) {
  const wordTrayScrollRef = useScrollRevealScrollbar<HTMLDivElement>();

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
      className={clsx(
        embedded
          ? "flex h-full w-56 shrink-0 flex-col bg-sec-panel/25 xl:w-64"
          : "hidden w-full shrink-0 flex-col overflow-hidden rounded-xl border-2 border-sec-ink bg-white lg:flex lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:w-72 xl:w-80",
      )}
      aria-label="Today's vocabulary list"
      {...(inert ? { inert: true } : {})}
    >
      <div
        className={clsx(
          "flex min-h-10 shrink-0 items-center border-b-2 border-sec-ink/15 bg-sec-panel px-3 py-2.5",
          embedded ? null : "rounded-t-xl",
        )}
      >
        <p className={secondaryUi.eyebrow}>Today&apos;s words</p>
      </div>

      <div
        ref={wordTrayScrollRef}
        className={clsx(
          "scrollbar-reveal",
          embedded ? "min-h-0 flex-1 overflow-y-auto" : "lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
        )}
      >
        {!hydrated ? (
          <ul className="space-y-1 p-1.5" aria-hidden>
            {Array.from({ length: 10 }).map((_, index) => (
              <li
                key={index}
                className="h-9 animate-pulse rounded-lg border border-sec-ink/15 bg-sec-panel/60"
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
              imageUrlsByWordId={imageUrlsByWordId}
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
              imageUrlsByWordId={imageUrlsByWordId}
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
