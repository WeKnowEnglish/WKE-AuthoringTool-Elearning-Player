export type StickerRarity = "common" | "uncommon" | "rare" | "epic";

export type StickerDef = {
  id: string;
  label: string;
  emoji: string;
  rarity: StickerRarity;
};

function buildTier(
  rarity: StickerRarity,
  items: readonly { label: string; emoji: string }[],
): StickerDef[] {
  return items.map((item, i) => ({
    id: `${rarity}-${String(i + 1).padStart(3, "0")}`,
    label: item.label,
    emoji: item.emoji,
    rarity,
  }));
}

/** 60 commons — everyday kid-friendly icons; each emoji appears once in the whole library. */
const COMMON_ITEMS = [
  { label: "Lucky Star", emoji: "⭐" },
  { label: "Four-Leaf Clover", emoji: "🍀" },
  { label: "Cherry Blossom", emoji: "🌸" },
  { label: "Sunshine Smile", emoji: "🌞" },
  { label: "Crunchy Apple", emoji: "🍎" },
  { label: "Soccer Ball", emoji: "⚽" },
  { label: "Party Balloon", emoji: "🎈" },
  { label: "Music Note", emoji: "🎵" },
  { label: "Blue Notebook", emoji: "📘" },
  { label: "Puzzle Piece", emoji: "🧩" },
  { label: "Banana Bunch", emoji: "🍌" },
  { label: "Grape Cluster", emoji: "🍇" },
  { label: "Orange Slice", emoji: "🍊" },
  { label: "Garden Carrot", emoji: "🥕" },
  { label: "Broccoli Tree", emoji: "🥦" },
  { label: "Pizza Slice", emoji: "🍕" },
  { label: "Ice Cream Cone", emoji: "🍦" },
  { label: "Frosted Cupcake", emoji: "🧁" },
  { label: "Hot Cocoa", emoji: "☕" },
  { label: "Juice Cup", emoji: "🥤" },
  { label: "Curious Kitten", emoji: "🐱" },
  { label: "Playful Puppy", emoji: "🐶" },
  { label: "Cuddly Bear", emoji: "🐻" },
  { label: "Panda Pal", emoji: "🐼" },
  { label: "Sleepy Koala", emoji: "🐨" },
  { label: "Stripy Tiger", emoji: "🐯" },
  { label: "Proud Lion", emoji: "🦁" },
  { label: "Spotted Cow", emoji: "🐮" },
  { label: "Pink Piglet", emoji: "🐷" },
  { label: "Clucky Chicken", emoji: "🐔" },
  { label: "Waddling Penguin", emoji: "🐧" },
  { label: "Bluebird", emoji: "🐦" },
  { label: "Rubber Duck", emoji: "🦆" },
  { label: "Tiny Turtle", emoji: "🐢" },
  { label: "Garden Snake", emoji: "🐍" },
  { label: "Tropical Fish", emoji: "🐠" },
  { label: "Spring Butterfly", emoji: "🦋" },
  { label: "Busy Bee", emoji: "🐝" },
  { label: "Crescent Moon", emoji: "🌙" },
  { label: "Partly Cloudy", emoji: "⛅" },
  { label: "Rain Shower", emoji: "🌧️" },
  { label: "Snow Crystal", emoji: "❄️" },
  { label: "School Bell", emoji: "🔔" },
  { label: "Stacked Books", emoji: "📚" },
  { label: "Sharp Pencil", emoji: "✏️" },
  { label: "Color Crayons", emoji: "🖍️" },
  { label: "Soft Teddy", emoji: "🧸" },
  { label: "Flying Kite", emoji: "🪁" },
  { label: "Playground Slide", emoji: "🛝" },
  { label: "Cozy House", emoji: "🏠" },
  { label: "Bicycle Ride", emoji: "🚲" },
  { label: "Yellow School Bus", emoji: "🚌" },
  { label: "Red Car", emoji: "🚗" },
  { label: "Sailboat", emoji: "⛵" },
  { label: "Sunny Sunflower", emoji: "🌻" },
  { label: "Spring Tulip", emoji: "🌷" },
  { label: "Forest Mushroom", emoji: "🍄" },
  { label: "Pine Tree", emoji: "🌲" },
  { label: "River Rock", emoji: "🪨" },
  { label: "Birthday Gift", emoji: "🎁" },
] as const;

/** 25 uncommons — hobbies & flair; one unicorn only. */
const UNCOMMON_ITEMS = [
  { label: "Clever Fox", emoji: "🦊" },
  { label: "Rainbow Unicorn", emoji: "🦄" },
  { label: "Leaping Dolphin", emoji: "🐬" },
  { label: "Sky Rainbow", emoji: "🌈" },
  { label: "Paint Palette", emoji: "🎨" },
  { label: "Game Controller", emoji: "🎮" },
  { label: "Theater Masks", emoji: "🎭" },
  { label: "Circus Tent", emoji: "🎪" },
  { label: "Stage Mic", emoji: "🎤" },
  { label: "Electric Guitar", emoji: "🎸" },
  { label: "Brass Trumpet", emoji: "🎺" },
  { label: "Tennis Match", emoji: "🎾" },
  { label: "Basketball Hoop", emoji: "🏀" },
  { label: "Football Field", emoji: "🏈" },
  { label: "Softball", emoji: "🥎" },
  { label: "Roller Skates", emoji: "🛼" },
  { label: "Yo-Yo Pro", emoji: "🪀" },
  { label: "Stargazer Scope", emoji: "🔭" },
  { label: "Cool Sunglasses", emoji: "🕶️" },
  { label: "Explorer Compass", emoji: "🧭" },
  { label: "Treasure Map", emoji: "🗺️" },
  { label: "Snapshot Camera", emoji: "📷" },
  { label: "Movie Clapper", emoji: "🎬" },
  { label: "Pink Flamingo", emoji: "🦩" },
  { label: "Chatty Parrot", emoji: "🦜" },
] as const;

/** 12 rares — big fantasy & power symbols. */
const RARE_ITEMS = [
  { label: "Ancient Dragon", emoji: "🐉" },
  { label: "Magic Wand", emoji: "🪄" },
  { label: "UFO Visitor", emoji: "🛸" },
  { label: "Lightning Strike", emoji: "⚡" },
  { label: "Bonfire Night", emoji: "🔥" },
  { label: "Mighty Volcano", emoji: "🌋" },
  { label: "Mountain Eagle", emoji: "🦅" },
  { label: "Galaxy Swirl", emoji: "🌌" },
  { label: "Moon Rocket", emoji: "🚀" },
  { label: "Royal Diamond", emoji: "💎" },
  { label: "Bullseye Target", emoji: "🎯" },
  { label: "Gold Medal", emoji: "🏅" },
] as const;

/** 3 epics — top shelf. */
const EPIC_ITEMS = [
  { label: "Champion Trophy", emoji: "🏆" },
  { label: "Royal Crown", emoji: "👑" },
  { label: "Seer Crystal", emoji: "🔮" },
] as const;

const common = buildTier("common", COMMON_ITEMS);
const uncommon = buildTier("uncommon", UNCOMMON_ITEMS);
const rare = buildTier("rare", RARE_ITEMS);
const epic = buildTier("epic", EPIC_ITEMS);

export const STICKER_LIBRARY: StickerDef[] = [...common, ...uncommon, ...rare, ...epic];

if (STICKER_LIBRARY.length !== 100) {
  throw new Error(`STICKER_LIBRARY expected 100 stickers, got ${STICKER_LIBRARY.length}`);
}
{
  const seen = new Set<string>();
  for (const s of STICKER_LIBRARY) {
    if (seen.has(s.emoji)) {
      throw new Error(`Duplicate sticker emoji ${s.emoji} on ${s.id}`);
    }
    seen.add(s.emoji);
  }
}

/** Card frame — same look as the sticker book (profile store). */
export const STICKER_CARD_RING: Record<StickerRarity, string> = {
  common: "border-slate-400 bg-gradient-to-b from-amber-50 to-white shadow-[4px_4px_0_rgba(15,23,42,0.12)]",
  uncommon: "border-emerald-500 bg-gradient-to-b from-emerald-50 to-white shadow-[4px_4px_0_rgba(5,150,105,0.2)]",
  rare: "border-violet-600 bg-gradient-to-b from-violet-50 to-white shadow-[4px_4px_0_rgba(124,58,237,0.25)]",
  epic: "border-amber-500 bg-gradient-to-b from-amber-100 via-yellow-50 to-white shadow-[4px_4px_0_rgba(180,83,9,0.35)]",
};

export const STICKER_RARITY_LABEL_CLASS: Record<StickerRarity, string> = {
  common: "text-slate-600",
  uncommon: "text-emerald-700",
  rare: "text-violet-700",
  epic: "text-amber-800",
};

/** Deterministic sticker when a quick-quiz question has no media `image_url`. */
export function pickStickerForQuizFallback(seed: string, questionIndex: number): StickerDef {
  let h = 1779033703;
  const s = `${seed}\0q${questionIndex}`;
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const idx = (h >>> 0) % STICKER_LIBRARY.length;
  return STICKER_LIBRARY[idx]!;
}

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
