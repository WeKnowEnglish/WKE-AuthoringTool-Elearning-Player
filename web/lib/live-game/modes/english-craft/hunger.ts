import type { LiveGamePlayerHunger } from "@/lib/live-game/liveblocks/config";
import {
  ENGLISH_CRAFT_HUNGER_DECAY_AMOUNT,
  ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS,
  ENGLISH_CRAFT_HUNGER_LOW_WARNING,
  ENGLISH_CRAFT_HUNGER_MAX,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { FULL_LIVE_GAME_PLAYER_HUNGER } from "@/lib/live-game/server/read-player-hunger";

export function reconcilePlayerHunger(
  hunger: LiveGamePlayerHunger,
  now: number,
  playing: boolean,
): LiveGamePlayerHunger {
  if (!playing) {
    return {
      value: Math.max(0, Math.min(ENGLISH_CRAFT_HUNGER_MAX, hunger.value)),
      lastUpdatedAt: hunger.lastUpdatedAt,
    };
  }

  const baseValue =
    hunger.lastUpdatedAt === 0 ? FULL_LIVE_GAME_PLAYER_HUNGER : hunger.value;
  const baseUpdatedAt = hunger.lastUpdatedAt === 0 ? now : hunger.lastUpdatedAt;
  const elapsed = Math.max(0, now - baseUpdatedAt);
  const ticks = Math.floor(elapsed / ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS);

  if (ticks <= 0) {
    return {
      value: Math.max(0, Math.min(ENGLISH_CRAFT_HUNGER_MAX, baseValue)),
      lastUpdatedAt: baseUpdatedAt,
    };
  }

  return {
    value: Math.max(
      0,
      Math.min(ENGLISH_CRAFT_HUNGER_MAX, baseValue - ticks * ENGLISH_CRAFT_HUNGER_DECAY_AMOUNT),
    ),
    lastUpdatedAt: baseUpdatedAt + ticks * ENGLISH_CRAFT_HUNGER_DECAY_INTERVAL_MS,
  };
}

export function isPlayerStarving(
  hunger: LiveGamePlayerHunger,
  now: number,
  playing: boolean,
): boolean {
  return reconcilePlayerHunger(hunger, now, playing).value <= 0;
}

export function isPlayerHungerLow(
  hunger: LiveGamePlayerHunger,
  now: number,
  playing: boolean,
): boolean {
  const value = reconcilePlayerHunger(hunger, now, playing).value;
  return value > 0 && value <= ENGLISH_CRAFT_HUNGER_LOW_WARNING;
}
