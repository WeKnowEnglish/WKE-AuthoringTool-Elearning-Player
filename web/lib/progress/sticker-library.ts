export type StickerRarity = "common" | "uncommon" | "rare" | "epic";

export type StickerDef = {
  id: string;
  label: string;
  emoji: string;
  rarity: StickerRarity;
};

function makeSet(
  rarity: StickerRarity,
  startIndex: number,
  count: number,
  labelPrefix: string,
  emojiPool: string[],
): StickerDef[] {
  const out: StickerDef[] = [];
  for (let i = 0; i < count; i += 1) {
    const n = startIndex + i + 1;
    out.push({
      id: `${rarity}-${n.toString().padStart(3, "0")}`,
      label: `${labelPrefix} ${n}`,
      emoji: emojiPool[i % emojiPool.length] ?? "⭐",
      rarity,
    });
  }
  return out;
}

const COMMON_EMOJIS = ["⭐", "🍀", "🌸", "🌞", "🍎", "⚽", "🎈", "🎵", "📘", "🧩"];
const UNCOMMON_EMOJIS = ["🦊", "🦄", "🐬", "🌈", "🚀", "🎯", "🏅", "🎨", "🎮", "💎"];
const RARE_EMOJIS = ["🐉", "👑", "🪄", "🛸", "⚡", "🔥", "🌋", "🦅", "🌌", "🔮"];
const EPIC_EMOJIS = ["🏆", "🦁", "👽", "🌠", "💫", "🪙", "🦖", "🐲", "👸", "🤖"];

const common = makeSet("common", 0, 60, "Common Sticker", COMMON_EMOJIS);
const uncommon = makeSet("uncommon", 0, 25, "Uncommon Sticker", UNCOMMON_EMOJIS);
const rare = makeSet("rare", 0, 12, "Rare Sticker", RARE_EMOJIS);
const epic = makeSet("epic", 0, 3, "Epic Sticker", EPIC_EMOJIS);

export const STICKER_LIBRARY: StickerDef[] = [...common, ...uncommon, ...rare, ...epic];

const RARITY_WEIGHTS: Record<StickerRarity, number> = {
  common: 65,
  uncommon: 24,
  rare: 9,
  epic: 2,
};

export function pickRandomSticker(): StickerDef {
  const totalWeight =
    RARITY_WEIGHTS.common + RARITY_WEIGHTS.uncommon + RARITY_WEIGHTS.rare + RARITY_WEIGHTS.epic;
  let roll = Math.random() * totalWeight;
  const rarityOrder: StickerRarity[] = ["common", "uncommon", "rare", "epic"];
  let pickedRarity: StickerRarity = "common";
  for (const rarity of rarityOrder) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll <= 0) {
      pickedRarity = rarity;
      break;
    }
  }
  const pool = STICKER_LIBRARY.filter((s) => s.rarity === pickedRarity);
  return pool[Math.floor(Math.random() * pool.length)] ?? STICKER_LIBRARY[0]!;
}
