import { rollWeightedHarvestLetter } from "@/lib/garden/harvest-weights";
import { recordGardenHarvestQuest, recordGardenWeedClearedQuest } from "@/lib/garden/garden-quests";
import { newGardenId, WATERING_CAN_GROW_MULTIPLIER } from "@/lib/garden/defaults";
import {
  canUseFertilizer,
  hasFertilizerUnlocked,
  isPlotTreated,
} from "@/lib/garden/fertilizer";
import { growDurationMs, GROW_MS_BY_TIER, resolveGrowthStage } from "@/lib/garden/growth";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import { canUseWateringCan, hasWateringCanUnlocked } from "@/lib/garden/watering-can";
import { plotHasWeed } from "@/lib/garden/weeds";
import type {
  FarmPlot,
  GardenSeed,
  GardenSeedTier,
  GardenSnapshotV1,
  LetterInventory,
} from "@/lib/garden/types";

export function plotAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
): FarmPlot | undefined {
  return snapshot.plots.find((p) => p.row === row && p.col === col);
}

function updatePlot(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  patch: Partial<FarmPlot>,
): GardenSnapshotV1 {
  return {
    ...snapshot,
    plots: snapshot.plots.map((p) =>
      p.row === row && p.col === col ? { ...p, ...patch } : p,
    ),
  };
}

function addLetter(inventory: LetterInventory, letter: string): LetterInventory {
  const ch = letter.toUpperCase();
  return { ...inventory, [ch]: (inventory[ch] ?? 0) + 1 };
}

export function grantGardenSeed(input: {
  eventId: string;
  tier?: GardenSeedTier;
  now?: number;
}): GardenSnapshotV1 {
  const now = input.now ?? Date.now();
  const snap = getGardenSnapshot();
  if (snap.seedPouch.some((s) => s.sourceEventId === input.eventId)) return snap;

  const seed: GardenSeed = {
    id: newGardenId(),
    tier: input.tier ?? "common",
    grantedAt: now,
    sourceEventId: input.eventId,
  };

  return setGardenSnapshot({
    ...snap,
    seedPouch: [...snap.seedPouch, seed],
    lastUpdatedAt: now,
  });
}

export type PlantResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | { ok: false; reason: "no_seed" | "plot_occupied" | "plot_missing" };

export function plantSeedAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): PlantResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (plot.seedId) return { ok: false, reason: "plot_occupied" };
  if (snapshot.seedPouch.length === 0) return { ok: false, reason: "no_seed" };

  const [seed, ...rest] = snapshot.seedPouch;
  if (!seed) return { ok: false, reason: "no_seed" };

  const next = setGardenSnapshot(
    updatePlot(
      {
        ...snapshot,
        seedPouch: rest,
        lastUpdatedAt: now,
      },
      row,
      col,
      {
        seedId: seed.id,
        seedTier: seed.tier,
        plantedAt: now,
        growMultiplier: 1,
        fertilizedAt: null,
        weedWord: null,
        weedRollDone: false,
      },
    ),
  );

  return { ok: true, snapshot: next };
}

export type HarvestResult =
  | { ok: true; snapshot: GardenSnapshotV1; letter: string }
  | { ok: false; reason: "plot_empty" | "not_ready" | "plot_missing" | "weed_blocking" };

export function harvestAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): HarvestResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!plot.seedId || !plot.seedTier || plot.plantedAt == null) {
    return { ok: false, reason: "plot_empty" };
  }

  const stage = resolveGrowthStage(plot, now, plot.seedTier);
  if (stage !== "ready") return { ok: false, reason: "not_ready" };
  if (plotHasWeed(plot)) return { ok: false, reason: "weed_blocking" };

  const letter = rollWeightedHarvestLetter(snapshot);
  const next = setGardenSnapshot(
    updatePlot(
      {
        ...snapshot,
        letters: addLetter(snapshot.letters, letter),
        lastUpdatedAt: now,
        totalHarvests: (snapshot.totalHarvests ?? 0) + 1,
      },
      row,
      col,
      {
        seedId: null,
        seedTier: null,
        plantedAt: null,
        growMultiplier: 1,
        fertilizedAt: null,
        weedWord: null,
        weedRollDone: false,
      },
    ),
  );

  recordGardenHarvestQuest();

  return { ok: true, snapshot: next, letter };
}

export type WaterResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | {
      ok: false;
      reason:
        | "no_item"
        | "on_cooldown"
        | "plot_empty"
        | "plot_ready"
        | "already_treated"
        | "plot_missing";
    };

/** Waters a growing crop to double growth speed (5-minute cooldown between uses). */
export function applyWateringCanAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): WaterResult {
  if (!hasWateringCanUnlocked(snapshot)) return { ok: false, reason: "no_item" };

  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!plot.seedId || !plot.seedTier || plot.plantedAt == null) {
    return { ok: false, reason: "plot_empty" };
  }

  const stage = resolveGrowthStage(plot, now, plot.seedTier);
  if (stage === "ready") return { ok: false, reason: "plot_ready" };
  if (isPlotTreated(plot)) return { ok: false, reason: "already_treated" };
  if (!canUseWateringCan(snapshot, now)) return { ok: false, reason: "on_cooldown" };

  const baseDuration = GROW_MS_BY_TIER[plot.seedTier];
  const elapsed = now - plot.plantedAt;
  const remainingAt1x = Math.max(0, baseDuration - elapsed);
  const newMultiplier = WATERING_CAN_GROW_MULTIPLIER;
  const newDuration = baseDuration / newMultiplier;
  const newRemaining = remainingAt1x / 2;
  const newPlantedAt = now - (newDuration - newRemaining);

  const next = setGardenSnapshot(
    updatePlot(
      { ...snapshot, lastWateringCanUsedAt: now, lastUpdatedAt: now },
      row,
      col,
      {
        growMultiplier: newMultiplier,
        plantedAt: newPlantedAt,
      },
    ),
  );

  return { ok: true, snapshot: next };
}

export type FertilizeResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | {
      ok: false;
      reason:
        | "no_item"
        | "on_cooldown"
        | "plot_empty"
        | "plot_ready"
        | "already_treated"
        | "plot_missing";
    };

/** Fertilizes a growing crop to ripen it instantly (15-minute cooldown between uses). */
export function applyFertilizerAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): FertilizeResult {
  if (!hasFertilizerUnlocked(snapshot)) return { ok: false, reason: "no_item" };

  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!plot.seedId || !plot.seedTier || plot.plantedAt == null) {
    return { ok: false, reason: "plot_empty" };
  }

  const stage = resolveGrowthStage(plot, now, plot.seedTier);
  if (stage === "ready") return { ok: false, reason: "plot_ready" };
  if (isPlotTreated(plot)) return { ok: false, reason: "already_treated" };
  if (!canUseFertilizer(snapshot, now)) return { ok: false, reason: "on_cooldown" };

  const duration = growDurationMs(plot.seedTier, 1);
  const newPlantedAt = now - duration;

  const next = setGardenSnapshot(
    updatePlot(
      { ...snapshot, lastFertilizerUsedAt: now, lastUpdatedAt: now },
      row,
      col,
      {
        plantedAt: newPlantedAt,
        growMultiplier: 1,
        fertilizedAt: now,
      },
    ),
  );

  return { ok: true, snapshot: next };
}

export type ClearWeedResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | { ok: false; reason: "no_weed" | "word_mismatch" | "plot_missing" | "plot_empty" };

export function tryClearWeedAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  word: string,
  now = Date.now(),
): ClearWeedResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!plot.seedId || !plot.weedWord) return { ok: false, reason: "no_weed" };

  const normalized = word.trim().toUpperCase();
  if (normalized !== plot.weedWord.toUpperCase()) {
    return { ok: false, reason: "word_mismatch" };
  }

  const next = setGardenSnapshot(
    updatePlot({ ...snapshot, lastUpdatedAt: now }, row, col, { weedWord: null }),
  );

  recordGardenWeedClearedQuest();

  return { ok: true, snapshot: next };
}
