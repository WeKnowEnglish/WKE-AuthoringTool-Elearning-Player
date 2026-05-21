import { READING_MIXED_ITEMS } from "./sets/example-mixed-items";
import type { ReadingSetDefinition, ReadingSetId } from "./types";
import { isReadingSetId } from "./types";

export type ReadingMenuEntry = { id: ReadingSetId; label: string };

export const READING_SET_MENU: ReadingMenuEntry[] = [
  { id: "reading_mixed_items", label: "Reading practice (sample)" },
];

const SETS: Record<ReadingSetId, ReadingSetDefinition> = {
  reading_mixed_items: READING_MIXED_ITEMS,
};

export function getReadingSet(id: ReadingSetId): ReadingSetDefinition {
  return SETS[id];
}

export function tryGetReadingSet(id: string): ReadingSetDefinition | null {
  return isReadingSetId(id) ? SETS[id] : null;
}

export function readingSetCoverImageSrc(id: ReadingSetId): string {
  return getReadingSet(id).coverImageUrl;
}
