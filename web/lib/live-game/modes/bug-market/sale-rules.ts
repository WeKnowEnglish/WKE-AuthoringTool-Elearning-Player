import type { BugMarketRarity } from "@/lib/live-game/modes/bug-market/state";
import { BUG_MARKET_MAP_V1_DOCUMENT } from "@/lib/live-game/modes/bug-market/map-v1";
import { getBugMarketMapRegion } from "@/lib/live-game/modes/bug-market/map-schema";

const counterRegion = getBugMarketMapRegion(BUG_MARKET_MAP_V1_DOCUMENT, "counter");
const shopRegion = getBugMarketMapRegion(BUG_MARKET_MAP_V1_DOCUMENT, "upgrade_shop");
export const BUG_MARKET_COUNTER_ZONE = { minX: counterRegion.x, maxX: counterRegion.x + counterRegion.w, minY: counterRegion.y, maxY: counterRegion.y + counterRegion.h } as const;
export const BUG_MARKET_SHOP_ZONE = { minX: shopRegion.x, maxX: shopRegion.x + shopRegion.w, minY: shopRegion.y, maxY: shopRegion.y + shopRegion.h } as const;
export const BUG_MARKET_NET_LEVEL_2_COST = 4;

export const BUG_MARKET_SALE_COINS: Readonly<Record<BugMarketRarity, number>> = {
  common: 2,
  uncommon: 4,
  rare: 7,
};

export function isNearBugMarketCounter(position: { x: number; y: number; updatedAt: number } | null, now = Date.now()): boolean {
  return Boolean(
    position &&
    now - position.updatedAt <= 5_000 &&
    position.x >= BUG_MARKET_COUNTER_ZONE.minX &&
    position.x <= BUG_MARKET_COUNTER_ZONE.maxX &&
    position.y >= BUG_MARKET_COUNTER_ZONE.minY &&
    position.y <= BUG_MARKET_COUNTER_ZONE.maxY,
  );
}

export function bugMarketCoinsForRarity(rarity: BugMarketRarity): number {
  return BUG_MARKET_SALE_COINS[rarity];
}

export function isNearBugMarketShop(position: { x: number; y: number; updatedAt: number } | null, now = Date.now()): boolean {
  return Boolean(position && now - position.updatedAt <= 5_000 && position.x >= BUG_MARKET_SHOP_ZONE.minX && position.x <= BUG_MARKET_SHOP_ZONE.maxX && position.y >= BUG_MARKET_SHOP_ZONE.minY && position.y <= BUG_MARKET_SHOP_ZONE.maxY);
}

export function bugMarketNetRangePx(netLevel: number): number {
  return netLevel >= 2 ? 180 : 125;
}
