export const DRINK_ADJECTIVES = [
  "sour",
  "juicy",
  "red",
  "green",
  "sweet",
  "creamy",
  "cold",
] as const;

export type DrinkAdjective = (typeof DRINK_ADJECTIVES)[number];

export type DrinkRequestDisplay = {
  adjective: DrinkAdjective;
  line: string;
  speakText: string;
  cueEmoji: string;
};

const ADJECTIVE_META: Record<
  DrinkAdjective,
  { label: string; cueEmoji: string }
> = {
  sour: { label: "sour", cueEmoji: "🍋" },
  juicy: { label: "juicy", cueEmoji: "🍊" },
  red: { label: "red", cueEmoji: "🍓" },
  green: { label: "green", cueEmoji: "🍏" },
  sweet: { label: "sweet", cueEmoji: "🍬" },
  creamy: { label: "creamy", cueEmoji: "🥛" },
  cold: { label: "cold", cueEmoji: "🧊" },
};

export function isDrinkAdjective(value: string): value is DrinkAdjective {
  return (DRINK_ADJECTIVES as readonly string[]).includes(value);
}

export function formatRequest(adjective: DrinkAdjective): DrinkRequestDisplay {
  const meta = ADJECTIVE_META[adjective];
  const line = `I want something ${meta.label}!`;
  return {
    adjective,
    line,
    speakText: line,
    cueEmoji: meta.cueEmoji,
  };
}

export function getAdjectiveCueEmoji(adjective: DrinkAdjective): string {
  return ADJECTIVE_META[adjective].cueEmoji;
}

/** Sample `count` adjectives without replacement. */
export function pickDistinctAdjectives(
  count: number,
  random: () => number = Math.random,
): DrinkAdjective[] {
  const pool = [...DRINK_ADJECTIVES];
  const picked: DrinkAdjective[] = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]!);
  }
  return picked;
}

export function createMainRequests(
  random: () => number = Math.random,
): [DrinkAdjective, DrinkAdjective, DrinkAdjective] {
  const picked = pickDistinctAdjectives(3, random);
  if (picked.length !== 3) {
    throw new Error("Not enough adjectives for a drink session");
  }
  return [picked[0]!, picked[1]!, picked[2]!];
}
