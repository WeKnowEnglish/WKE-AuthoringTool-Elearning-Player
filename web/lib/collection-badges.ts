"use client";

import { getProgressSnapshot } from "@/lib/progress/local-storage";
import { getRewards } from "@/lib/progress/rewards";
import { getWorldWordDiscoverySummary } from "@/lib/explore/area-discovery";
import { getExploreProgressSnapshot } from "@/lib/explore/explore-progress";
import { listCollectedWords } from "@/lib/word-collection";

export type CollectionBadgeId =
  | "first_sticker"
  | "first_vocab_set"
  | "world_explorer_25"
  | "first_word"
  | "first_explore_run";

export type CollectionBadgeDef = {
  id: CollectionBadgeId;
  label: string;
  emoji: string;
  description: string;
};

export const COLLECTION_BADGE_REGISTRY: CollectionBadgeDef[] = [
  {
    id: "first_sticker",
    label: "First sticker",
    emoji: "⭐",
    description: "Buy or earn your first sticker.",
  },
  {
    id: "first_vocab_set",
    label: "Vocab explorer",
    emoji: "📖",
    description: "Finish a vocabulary set.",
  },
  {
    id: "world_explorer_25",
    label: "World scout",
    emoji: "🧭",
    description: "Explore 25% of Simple World.",
  },
  {
    id: "first_word",
    label: "Word finder",
    emoji: "🔤",
    description: "Collect your first word from explore loot.",
  },
  {
    id: "first_explore_run",
    label: "Explorer",
    emoji: "🗺️",
    description: "Finish your first explore run from Home.",
  },
];

export type CollectionBadgeStatus = {
  def: CollectionBadgeDef;
  earned: boolean;
};

export function evaluateCollectionBadges(): CollectionBadgeStatus[] {
  const rewards = getRewards();
  const progress = getProgressSnapshot();
  const exploration = getWorldWordDiscoverySummary();
  const words = listCollectedWords();
  const vocabDone = progress.completedLessonIds.some((id) => id.startsWith("vocab-"));

  const earned: Record<CollectionBadgeId, boolean> = {
    first_sticker: (rewards.ownedStickerIds?.length ?? 0) > 0,
    first_vocab_set: vocabDone,
    world_explorer_25: exploration.percent >= 25,
    first_word: words.length > 0,
    first_explore_run: (getExploreProgressSnapshot().totalRunsCompleted ?? 0) > 0,
  };

  return COLLECTION_BADGE_REGISTRY.map((def) => ({
    def,
    earned: earned[def.id] ?? false,
  }));
}
