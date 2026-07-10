import type { SecondaryFocusWordSwap } from "@/lib/secondary/secondary-session-swap-detect";

export const SWAP_ANNOUNCED_PREFIX = "secondary-swap-announced-v1:";

function storageKey(studentId: string, dateKey: string): string {
  return `${SWAP_ANNOUNCED_PREFIX}${studentId}:${dateKey}`;
}

export function swapAnnouncementKey(outWordItemId: string, inWordItemId: string): string {
  return `${outWordItemId}:${inWordItemId}`;
}

export function getAnnouncedSwapKeys(studentId: string, dateKey: string): Set<string> {
  if (typeof window === "undefined" || !studentId || !dateKey) return new Set();

  try {
    const raw = localStorage.getItem(storageKey(studentId, dateKey));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((entry): entry is string => typeof entry === "string"));
  } catch {
    return new Set();
  }
}

function writeAnnouncedSwapKeys(studentId: string, dateKey: string, keys: Set<string>): void {
  if (typeof window === "undefined" || !studentId || !dateKey) return;

  try {
    localStorage.setItem(storageKey(studentId, dateKey), JSON.stringify([...keys]));
  } catch {
    // ignore quota
  }
}

export function markSwapAnnounced(
  studentId: string,
  dateKey: string,
  swap: SecondaryFocusWordSwap,
): void {
  const keys = getAnnouncedSwapKeys(studentId, dateKey);
  keys.add(swapAnnouncementKey(swap.outWordItemId, swap.inWordItemId));
  writeAnnouncedSwapKeys(studentId, dateKey, keys);
}

export function filterUnannouncedSwaps(
  swaps: SecondaryFocusWordSwap[],
  announced: Set<string>,
): SecondaryFocusWordSwap[] {
  return swaps.filter(
    (swap) => !announced.has(swapAnnouncementKey(swap.outWordItemId, swap.inWordItemId)),
  );
}

/** Tests and debug only. */
export function clearAnnouncedSwaps(studentId: string, dateKey: string): void {
  if (typeof window === "undefined" || !studentId || !dateKey) return;

  try {
    localStorage.removeItem(storageKey(studentId, dateKey));
  } catch {
    // ignore
  }
}
