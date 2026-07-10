import type { SecondaryFocusWordSwap } from "@/lib/secondary/secondary-session-swap-detect";
import { swapAnnouncementKey } from "@/lib/secondary/secondary-swap-announcement";

export function swapQueueItemKey(swap: SecondaryFocusWordSwap): string {
  return swapAnnouncementKey(swap.outWordItemId, swap.inWordItemId);
}

/** Append swaps without duplicating items already in the queue. */
export function mergeSwapQueue(
  current: SecondaryFocusWordSwap[],
  incoming: SecondaryFocusWordSwap[],
): SecondaryFocusWordSwap[] {
  if (incoming.length === 0) return current;

  const seen = new Set(current.map(swapQueueItemKey));
  const merged = [...current];

  for (const swap of incoming) {
    const key = swapQueueItemKey(swap);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(swap);
  }

  return merged;
}

export function popSwapQueue(queue: SecondaryFocusWordSwap[]): {
  head: SecondaryFocusWordSwap | null;
  rest: SecondaryFocusWordSwap[];
} {
  if (queue.length === 0) return { head: null, rest: [] };
  const [head, ...rest] = queue;
  return { head: head ?? null, rest };
}

export function shouldOpenSwapModal(introOpen: boolean, queueLength: number): boolean {
  return !introOpen && queueLength > 0;
}
