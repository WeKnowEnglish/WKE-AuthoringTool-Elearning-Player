import { assignCropIdentity, rollCropLetter } from "@/lib/garden/crop-letter";
import { recordGardenHarvestQuest, recordGardenWeedClearedQuest } from "@/lib/garden/garden-quests";
import { newGardenId, WATERING_CAN_GROW_MULTIPLIER } from "@/lib/garden/defaults";
import {
  canUseFertilizer,
  hasFertilizerUnlocked,
  isPlotTreated,
} from "@/lib/garden/fertilizer";
import { growDurationMs, GROW_MS_BY_TIER, resolveGrowthStage } from "@/lib/garden/growth";
import { isPlotUnlocked } from "@/lib/garden/plot-unlock";
import { getGardenSnapshot, setGardenSnapshot } from "@/lib/garden/storage";
import { canUseWateringCan, hasWateringCanUnlocked } from "@/lib/garden/watering-can";
import {
  applyWeedBattleFailure,
  isWeedBattleExpired,
  isWeedMonsterOnCooldown,
  normalizeWordSlots,
  startWeedBattleOnPuzzle,
  validateWeedBattleSolution,
  type WeedBattleFailReason,
  type WeedBattleWordSlots,
} from "@/lib/garden/weed-battle";
import { plotHasWeedMonster } from "@/lib/garden/weed-monsters";
import {
  grantWeedMonsterVictoryRewards,
  type WeedBattleVictoryRewards,
} from "@/lib/garden/weed-battle-rewards";
import type {
  FarmPlot,
  GardenSeed,
  GardenSeedTier,
  GardenSnapshotV1,
  LetterInventory,
  WeedMonsterPuzzle,
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
  | {
      ok: false;
      reason: "no_seed" | "plot_occupied" | "plot_missing" | "plot_locked" | "weed_monster_blocking";
    };

export function plantSeedAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): PlantResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
  if (plotHasWeedMonster(plot)) return { ok: false, reason: "weed_monster_blocking" };
  if (plot.seedId) return { ok: false, reason: "plot_occupied" };
  if (snapshot.seedPouch.length === 0) return { ok: false, reason: "no_seed" };

  const [seed, ...rest] = snapshot.seedPouch;
  if (!seed) return { ok: false, reason: "no_seed" };

  const { cropLetter, fruitSlug } = assignCropIdentity(snapshot);

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
        weedMonster: null,
        cropLetter,
        fruitSlug,
      },
    ),
  );

  return { ok: true, snapshot: next };
}

export type HarvestResult =
  | { ok: true; snapshot: GardenSnapshotV1; letter: string }
  | { ok: false; reason: "plot_empty" | "not_ready" | "plot_missing" | "plot_locked" };

export function harvestAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): HarvestResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
  if (!plot.seedId || !plot.seedTier || plot.plantedAt == null) {
    return { ok: false, reason: "plot_empty" };
  }

  const stage = resolveGrowthStage(plot, now, plot.seedTier);
  if (stage !== "ready") return { ok: false, reason: "not_ready" };

  const letter = plot.cropLetter ?? rollCropLetter(snapshot);
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
        cropLetter: null,
        fruitSlug: null,
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
        | "plot_missing"
        | "plot_locked";
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
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
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
        | "plot_missing"
        | "plot_locked";
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
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
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

type WeedBattlePlotError =
  | "plot_missing"
  | "plot_locked"
  | "plot_occupied"
  | "no_monster"
  | "on_cooldown";

function getWeedBattlePlot(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now: number,
):
  | { ok: true; plot: FarmPlot; puzzle: WeedMonsterPuzzle }
  | { ok: false; reason: WeedBattlePlotError } {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
  if (plot.seedId) return { ok: false, reason: "plot_occupied" };
  if (!plot.weedMonster) return { ok: false, reason: "no_monster" };
  if (isWeedMonsterOnCooldown(plot, now)) return { ok: false, reason: "on_cooldown" };
  return { ok: true, plot, puzzle: plot.weedMonster };
}

function persistWeedMonster(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  puzzle: WeedMonsterPuzzle | null,
  now: number,
): GardenSnapshotV1 {
  return setGardenSnapshot(
    updatePlot({ ...snapshot, lastUpdatedAt: now }, row, col, { weedMonster: puzzle }),
  );
}

export type StartWeedMonsterBattleResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | { ok: false; reason: WeedBattlePlotError };

export function startWeedMonsterBattle(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): StartWeedMonsterBattleResult {
  const plotState = getWeedBattlePlot(snapshot, row, col, now);
  if (!plotState.ok) return plotState;

  const next = persistWeedMonster(
    snapshot,
    row,
    col,
    startWeedBattleOnPuzzle(plotState.puzzle, now),
    now,
  );
  return { ok: true, snapshot: next };
}

export type DefeatWeedMonsterResult =
  | { ok: true; snapshot: GardenSnapshotV1; rewards: WeedBattleVictoryRewards }
  | {
      ok: false;
      reason:
        | WeedBattlePlotError
        | "battle_expired"
        | "invalid_submission"
        | "wrong_answer";
      snapshot?: GardenSnapshotV1;
    };

export function tryDefeatWeedMonster(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  slots: WeedBattleWordSlots | unknown,
  now = Date.now(),
): DefeatWeedMonsterResult {
  const plotState = getWeedBattlePlot(snapshot, row, col, now);
  if (!plotState.ok) return plotState;

  if (isWeedBattleExpired(plotState.puzzle, now)) {
    const failed = failWeedMonsterBattle(snapshot, row, col, now, "timeout");
    if (!failed.ok) return failed;
    return { ok: false, reason: "battle_expired", snapshot: failed.snapshot };
  }

  const normalized = normalizeWordSlots(slots);
  if (!normalized) return { ok: false, reason: "invalid_submission" };

  if (!validateWeedBattleSolution(plotState.puzzle, normalized)) {
    const failed = failWeedMonsterBattle(snapshot, row, col, now, "wrong_answer");
    if (!failed.ok) return failed;
    return { ok: false, reason: "wrong_answer", snapshot: failed.snapshot };
  }

  const cleared = persistWeedMonster(snapshot, row, col, null, now);
  const { snapshot: withRewards, rewards } = grantWeedMonsterVictoryRewards(
    cleared,
    plotState.puzzle.puzzleId,
    now,
  );
  recordGardenWeedClearedQuest();
  return { ok: true, snapshot: withRewards, rewards };
}

export type FailWeedMonsterBattleResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | { ok: false; reason: "plot_missing" | "plot_locked" | "plot_occupied" | "no_monster" };

export type AbandonWeedMonsterBattleResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | { ok: false; reason: "plot_missing" | "plot_locked" | "plot_occupied" | "no_monster" };

export function failWeedMonsterBattle(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
  _reason: WeedBattleFailReason = "timeout",
): FailWeedMonsterBattleResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
  if (plot.seedId) return { ok: false, reason: "plot_occupied" };
  if (!plot.weedMonster) return { ok: false, reason: "no_monster" };

  const next = persistWeedMonster(
    snapshot,
    row,
    col,
    applyWeedBattleFailure(plot.weedMonster, now),
    now,
  );
  return { ok: true, snapshot: next };
}

export function abandonWeedMonsterBattle(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): AbandonWeedMonsterBattleResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
  if (plot.seedId) return { ok: false, reason: "plot_occupied" };
  if (!plot.weedMonster) return { ok: false, reason: "no_monster" };

  const next = persistWeedMonster(
    snapshot,
    row,
    col,
    { ...plot.weedMonster, battleStartedAt: undefined },
    now,
  );
  return { ok: true, snapshot: next };
}

/** @deprecated Legacy single-word weed overlay — use tryDefeatWeedMonster. */
export type ClearWeedResult =
  | { ok: true; snapshot: GardenSnapshotV1 }
  | { ok: false; reason: "no_weed" | "word_mismatch" | "plot_missing" | "plot_empty" | "plot_locked" };

/** @deprecated Legacy single-word weed overlay — use tryDefeatWeedMonster. */
export function tryClearWeedAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  _word: string,
  _now = Date.now(),
): ClearWeedResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };
  if (!isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "plot_locked" };
  if (!plot.weedMonster) return { ok: false, reason: "no_weed" };
  return { ok: false, reason: "word_mismatch" };
}
