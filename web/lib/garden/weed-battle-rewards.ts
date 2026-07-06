import {
  WEED_BATTLE_GOLD_MAX,
  WEED_BATTLE_GOLD_MIN,
  WEED_BATTLE_SEED_REWARD,
  WEED_BATTLE_XP_REWARD,
  newGardenId,
} from "@/lib/garden/defaults";
import { setGardenSnapshot } from "@/lib/garden/storage";
import type { GardenSeed, GardenSnapshotV1 } from "@/lib/garden/types";
import { awardRewards, getRewards } from "@/lib/progress/rewards";

export type WeedBattleVictoryRewards = {
  seedsGranted: number;
  goldGranted: number;
  experienceGranted: number;
  duplicate: boolean;
};

export function weedBattleRewardEventId(puzzleId: string): string {
  return `weed-battle:${puzzleId}`;
}

export function weedBattleSeedEventId(puzzleId: string, index: number): string {
  return `weed-battle:${puzzleId}:seed:${index}`;
}

export function rollWeedBattleGold(rng: () => number = Math.random): number {
  const span = WEED_BATTLE_GOLD_MAX - WEED_BATTLE_GOLD_MIN + 1;
  return WEED_BATTLE_GOLD_MIN + Math.floor(rng() * span);
}

export function hasWeedBattleSeedsInPouch(
  snapshot: GardenSnapshotV1,
  puzzleId: string,
): boolean {
  const prefix = `${weedBattleRewardEventId(puzzleId)}:seed:`;
  return snapshot.seedPouch.some((seed) => seed.sourceEventId.startsWith(prefix));
}

export function formatWeedBattleVictoryMessage(rewards: WeedBattleVictoryRewards): string {
  if (rewards.duplicate) {
    return "You defeated the weed monster! The plot is yours.";
  }

  const parts: string[] = [];
  if (rewards.seedsGranted > 0) {
    parts.push(`+${rewards.seedsGranted} seed${rewards.seedsGranted === 1 ? "" : "s"}`);
  }
  if (rewards.goldGranted > 0) {
    parts.push(`+${rewards.goldGranted} gold`);
  }
  if (rewards.experienceGranted > 0) {
    parts.push(`+${rewards.experienceGranted} XP`);
  }

  if (parts.length === 0) {
    return "You defeated the weed monster! The plot is yours.";
  }

  return `You defeated the weed monster! ${parts.join(", ")}!`;
}

export function grantWeedMonsterVictoryRewards(
  snapshot: GardenSnapshotV1,
  puzzleId: string,
  now = Date.now(),
  rng: () => number = Math.random,
): { snapshot: GardenSnapshotV1; rewards: WeedBattleVictoryRewards } {
  const eventId = weedBattleRewardEventId(puzzleId);
  const alreadyClaimed = getRewards().rewardedEventIds.includes(eventId);

  if (alreadyClaimed) {
    return {
      snapshot: setGardenSnapshot(snapshot),
      rewards: {
        seedsGranted: 0,
        goldGranted: 0,
        experienceGranted: 0,
        duplicate: true,
      },
    };
  }

  const newSeeds: GardenSeed[] = [];
  if (!hasWeedBattleSeedsInPouch(snapshot, puzzleId)) {
    for (let index = 0; index < WEED_BATTLE_SEED_REWARD; index++) {
      newSeeds.push({
        id: newGardenId(),
        tier: "common",
        grantedAt: now,
        sourceEventId: weedBattleSeedEventId(puzzleId, index),
      });
    }
  }

  const goldGranted = rollWeedBattleGold(rng);
  const experienceGranted = WEED_BATTLE_XP_REWARD;
  awardRewards({
    goldDelta: goldGranted,
    experienceDelta: experienceGranted,
    eventId,
  });

  const nextSnapshot = setGardenSnapshot({
    ...snapshot,
    seedPouch: [...snapshot.seedPouch, ...newSeeds],
    lastUpdatedAt: now,
  });

  return {
    snapshot: nextSnapshot,
    rewards: {
      seedsGranted: newSeeds.length,
      goldGranted,
      experienceGranted,
      duplicate: false,
    },
  };
}
