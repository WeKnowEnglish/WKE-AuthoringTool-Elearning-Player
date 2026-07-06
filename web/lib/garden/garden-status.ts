import { resolveGrowthStage } from "@/lib/garden/growth";
import { isPlotUnlocked } from "@/lib/garden/plot-unlock";
import { spellingLevelProgress } from "@/lib/garden/spelling-levels";
import { totalLetterCount } from "@/lib/garden/spelling";
import type { GardenSnapshotV1 } from "@/lib/garden/types";
import { canUseWateringCan, hasWateringCanUnlocked } from "@/lib/garden/watering-can";
import {
  canUseFertilizer,
  hasFertilizerUnlocked,
  isPlotTreated,
} from "@/lib/garden/fertilizer";
import { plotHasWeedMonster } from "@/lib/garden/weed-monsters";
import { isUnlockAvailable } from "@/lib/progress/unlock-registry";

export type GardenAttentionKind =
  | "clear_weed"
  | "harvest_ready"
  | "plant_seeds"
  | "spell_words"
  | "water_crops"
  | "fertilize_crops";

export type GardenAttentionHint = {
  kind: GardenAttentionKind;
  message: string;
  buttonLabel: string;
};

export function getGardenAttentionHint(
  snapshot: GardenSnapshotV1,
  opts: {
    playerLevel: number;
    now?: number;
  },
): GardenAttentionHint | null {
  if (!isUnlockAvailable("language_garden", opts.playerLevel)) return null;

  const now = opts.now ?? Date.now();

  const hasWeedMonsterOnEmptyPlot = snapshot.plots.some((plot) => {
    if (!isPlotUnlocked(snapshot, plot.row, plot.col)) return false;
    if (plot.seedId) return false;
    return plotHasWeedMonster(plot);
  });
  if (hasWeedMonsterOnEmptyPlot) {
    return {
      kind: "clear_weed",
      message: "A weed monster is blocking an empty plot!",
      buttonLabel: "Fight the weed monster! 👾",
    };
  }

  const hasReadyCrop = snapshot.plots.some((plot) => {
    if (!isPlotUnlocked(snapshot, plot.row, plot.col)) return false;
    if (!plot.seedId || plot.plantedAt == null) return false;
    return resolveGrowthStage(plot, now, plot.seedTier ?? "common") === "ready";
  });
  if (hasReadyCrop) {
    return {
      kind: "harvest_ready",
      message: "A crop is ready to pick!",
      buttonLabel: "Harvest your garden! 🌾",
    };
  }

  const hasEmptyPlot = snapshot.plots.some(
    (plot) => !plot.seedId && isPlotUnlocked(snapshot, plot.row, plot.col),
  );
  if (snapshot.seedPouch.length > 0 && hasEmptyPlot) {
    return {
      kind: "plant_seeds",
      message: "You have seeds waiting to plant.",
      buttonLabel: "Plant a seed! 🌱",
    };
  }

  const spellProgress = spellingLevelProgress(snapshot.spellingLevel, snapshot.spelledAtLevel);
  const letterCount = totalLetterCount(snapshot.letters);
  if (letterCount >= 2 && spellProgress.spelled < spellProgress.total) {
    return {
      kind: "spell_words",
      message: "Use your letters to spell a word.",
      buttonLabel: "Spell a word! ✏️",
    };
  }

  if (hasWateringCanUnlocked(snapshot) && canUseWateringCan(snapshot, now)) {
    const hasGrowingCrop = snapshot.plots.some((plot) => {
      if (!isPlotUnlocked(snapshot, plot.row, plot.col)) return false;
      if (!plot.seedId || plot.plantedAt == null) return false;
      const stage = resolveGrowthStage(plot, now, plot.seedTier ?? "common");
      return stage === "sprout" || stage === "growing";
    });
    if (hasGrowingCrop) {
      return {
        kind: "water_crops",
        message: "Speed up a growing crop.",
        buttonLabel: "Water your crops! 🪣",
      };
    }
  }

  if (hasFertilizerUnlocked(snapshot) && canUseFertilizer(snapshot, now)) {
    const hasUntreatedGrowing = snapshot.plots.some((plot) => {
      if (!isPlotUnlocked(snapshot, plot.row, plot.col)) return false;
      if (!plot.seedId || plot.plantedAt == null) return false;
      if (isPlotTreated(plot)) return false;
      const stage = resolveGrowthStage(plot, now, plot.seedTier ?? "common");
      return stage === "sprout" || stage === "growing";
    });
    if (hasUntreatedGrowing) {
      return {
        kind: "fertilize_crops",
        message: "Ripen a growing crop instantly.",
        buttonLabel: "Fertilize a crop! 🧪",
      };
    }
  }

  return null;
}
