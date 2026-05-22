import { STICKER_LIBRARY, type StickerRarity } from "./sticker-library";

export const STICKER_COST_GOLD = 200;

export const STICKER_SELL_GOLD_BY_RARITY: Record<StickerRarity, number> = {
  common: 25,
  uncommon: 50,
  rare: 100,
  epic: 1000,
};

export const STICKER_RARITY_SORT_ORDER: Record<StickerRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
};

export function sellGoldForStickerId(stickerId: string): number | null {
  const def = STICKER_LIBRARY.find((s) => s.id === stickerId);
  return def ? STICKER_SELL_GOLD_BY_RARITY[def.rarity] : null;
}
