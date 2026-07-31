import type { BugMarketRarity } from "@/lib/live-game/modes/bug-market/state";

const BASE = "/assets/live-game/bug-market";

export type BugMarketSpeciesDefinition = {
  id: string;
  name: string;
  rarity: BugMarketRarity;
  assetUrl: string;
};

export const BUG_MARKET_SPECIES = [
  { id: "ant", name: "Ant", rarity: "common", assetUrl: `${BASE}/bugs/ant.webp` },
  { id: "bee", name: "Bee", rarity: "common", assetUrl: `${BASE}/bugs/bee.webp` },
  { id: "caterpillar", name: "Caterpillar", rarity: "common", assetUrl: `${BASE}/bugs/caterpillar.webp` },
  { id: "ladybug", name: "Ladybug", rarity: "common", assetUrl: `${BASE}/bugs/ladybug.webp` },
  { id: "butterfly", name: "Butterfly", rarity: "uncommon", assetUrl: `${BASE}/bugs/butterfly.webp` },
  { id: "rhinoceros-beetle", name: "Rhinoceros Beetle", rarity: "rare", assetUrl: `${BASE}/bugs/rhinoceros-beetle.webp` },
] as const satisfies readonly BugMarketSpeciesDefinition[];

export const BUG_MARKET_ASSETS = {
  counterEmpty: `${BASE}/world/counter-empty.webp`,
  meadowGrass: `${BASE}/world/meadow-grass.png`,
  nets: `${BASE}/equipment/nets.webp`,
} as const;
