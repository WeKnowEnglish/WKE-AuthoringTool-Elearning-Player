import {
  STICKER_LIBRARY,
  type StickerDef,
  type StickerRarity,
} from "@/lib/progress/sticker-library";

const RARITY_SORT_ORDER: Record<StickerRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
};

/** Unique sticker types the student owns at least one copy of. */
export function uniqueOwnedStickers(ownedStickerIds: readonly string[]): StickerDef[] {
  const seen = new Set<string>();
  const out: StickerDef[] = [];
  for (const id of ownedStickerIds) {
    if (seen.has(id)) continue;
    const def = STICKER_LIBRARY.find((s) => s.id === id);
    if (!def) continue;
    seen.add(id);
    out.push(def);
  }
  return out.sort((a, b) => {
    const rDiff = RARITY_SORT_ORDER[a.rarity] - RARITY_SORT_ORDER[b.rarity];
    if (rDiff !== 0) return rDiff;
    return a.label.localeCompare(b.label, undefined, { numeric: true });
  });
}
