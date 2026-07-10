import type { SecondaryTodaySession } from "@/lib/secondary/types";

export type SecondaryFocusWordSwap = {
  outWordItemId: string;
  inWordItemId: string;
};

/** Detect slow-replace swaps by diffing session audit arrays (replacedOut + introduced). */
export function detectNewFocusWordSwaps(
  previous: SecondaryTodaySession | null,
  next: SecondaryTodaySession,
): SecondaryFocusWordSwap[] {
  if (!previous) return [];
  if (previous.dateKey !== next.dateKey) return [];

  const prevReplaced = previous.replacedOutWordItemIds ?? [];
  const nextReplaced = next.replacedOutWordItemIds ?? [];
  const prevIntroduced = previous.introducedWordItemIds ?? [];
  const nextIntroduced = next.introducedWordItemIds ?? [];

  if (nextIntroduced.length < prevIntroduced.length) return [];

  const newOut = nextReplaced.slice(prevReplaced.length);
  const newIn = nextIntroduced.slice(prevIntroduced.length);

  if (newOut.length === 0 || newOut.length !== newIn.length) return [];

  return newOut.map((outWordItemId, index) => ({
    outWordItemId,
    inWordItemId: newIn[index]!,
  }));
}
