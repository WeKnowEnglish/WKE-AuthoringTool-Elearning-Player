"use client";

import { clsx } from "clsx";
import { getSecondaryWordDisplaySnapshot } from "@/lib/secondary/secondary-mastery-display";
import {
  mapMasteryLevelToLabel,
  masteryLevelChipClassName,
} from "@/lib/secondary/secondary-word-progress";
import { getSecondaryVocabItemById } from "@/lib/secondary/secondary-vocab-bank";

type Props = {
  hydrated: boolean;
  hasWordsToday: boolean;
  /** All of today's words, weakest first. */
  wordItemIds: string[];
  /** Subset that gets a focus ring (weakest words). */
  focusWordItemIds: ReadonlySet<string>;
};

export function SecondaryFocusWordsPanel({
  hydrated,
  hasWordsToday,
  wordItemIds,
  focusWordItemIds,
}: Props) {
  if (hydrated && !hasWordsToday) return null;

  return (
    <aside
      className="flex w-full shrink-0 flex-col rounded-xl border-2 border-kid-ink bg-white md:w-44 lg:w-48"
      aria-label="Today's vocabulary list"
    >
      <div className="shrink-0 border-b-2 border-kid-ink/15 bg-kid-panel px-3 py-2.5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/70">
          Today&apos;s words
        </p>
        <p className="mt-0.5 text-[0.65rem] font-semibold leading-snug text-kid-ink/60">
          Weakest at top · ring marks focus
        </p>
      </div>

      <div className="px-1.5 py-1">
        {!hydrated ? (
          <ul className="space-y-1" aria-hidden>
            {Array.from({ length: 10 }).map((_, index) => (
              <li
                key={index}
                className="h-8 animate-pulse rounded-lg border border-kid-ink/15 bg-kid-panel/60"
              />
            ))}
          </ul>
        ) : wordItemIds.length > 0 ? (
          <ol className="space-y-1">
            {wordItemIds.map((wordItemId, index) => {
              const item = getSecondaryVocabItemById(wordItemId);
              const snap = getSecondaryWordDisplaySnapshot(wordItemId);
              const chipClass = masteryLevelChipClassName(snap.legacyLevel);
              const isFocus = focusWordItemIds.has(wordItemId);
              return (
                <li
                  key={wordItemId}
                  className={clsx(
                    "rounded-lg border px-2 py-1",
                    chipClass,
                    isFocus && "ring-2 ring-kid-ink ring-offset-1",
                  )}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 tabular-nums text-sm font-extrabold opacity-80">
                      {index + 1}.
                    </span>
                    <span className="min-w-0 text-base font-extrabold leading-tight">
                      {item?.word ?? wordItemId}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold leading-tight opacity-90">
                    {mapMasteryLevelToLabel(snap.legacyLevel)}
                    {isFocus ? (
                      <span className="ml-1.5 font-extrabold uppercase tracking-wide opacity-80">
                        · Focus
                      </span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </aside>
  );
}
