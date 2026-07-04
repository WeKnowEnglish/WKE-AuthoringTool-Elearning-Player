import {
  WEED_GRACE_HARVESTS,
  WEED_MAX_ACTIVE,
  WEED_MAX_WORD_LENGTH,
  WEED_MIN_WORD_LENGTH,
  WEED_SPAWN_CHANCE,
} from "@/lib/garden/defaults";
import { resolveGrowthStage } from "@/lib/garden/growth";
import { getGardenSpellingLevel } from "@/lib/garden/spelling-levels";
import type { FarmPlot, GardenSnapshotV1 } from "@/lib/garden/types";

export function plotHasWeed(plot: FarmPlot): boolean {
  return typeof plot.weedWord === "string" && plot.weedWord.length > 0;
}

export function countActiveWeeds(plots: FarmPlot[]): number {
  return plots.filter(plotHasWeed).length;
}

export function pickWeedWord(
  snapshot: GardenSnapshotV1,
  rng: () => number = Math.random,
): string | undefined {
  const level = getGardenSpellingLevel(snapshot.spellingLevel);
  const spelled = new Set(snapshot.spelledAtLevel.map((w) => w.toUpperCase()));

  const qualifying = level.words.filter(
    (w) => w.length >= WEED_MIN_WORD_LENGTH && w.length <= WEED_MAX_WORD_LENGTH,
  );
  if (qualifying.length === 0) return undefined;

  const unspelled = qualifying.filter((w) => !spelled.has(w));
  const pool = unspelled.length > 0 ? unspelled : qualifying;
  const index = Math.floor(rng() * pool.length);
  return pool[index];
}

/** Read-time reconciliation: roll weeds on newly-ready plots. Pure — returns new snapshot. */
export function reconcileWeeds(
  snapshot: GardenSnapshotV1,
  now = Date.now(),
  rng: () => number = Math.random,
): GardenSnapshotV1 {
  const totalHarvests = snapshot.totalHarvests ?? 0;
  let activeWeeds = countActiveWeeds(snapshot.plots);
  let changed = false;

  const plots = snapshot.plots.map((plot) => {
    if (!plot.seedId || plot.plantedAt == null || !plot.seedTier) return plot;
    if (plot.weedRollDone) return plot;

    const stage = resolveGrowthStage(plot, now, plot.seedTier);
    if (stage !== "ready") return plot;

    changed = true;
    let next: FarmPlot = { ...plot, weedRollDone: true };

    if (totalHarvests < WEED_GRACE_HARVESTS) return next;
    if (activeWeeds >= WEED_MAX_ACTIVE) return next;
    if (rng() >= WEED_SPAWN_CHANCE) return next;

    const word = pickWeedWord(snapshot, rng);
    if (!word) return next;

    activeWeeds += 1;
    next = { ...next, weedWord: word };
    return next;
  });

  if (!changed) return snapshot;
  return { ...snapshot, plots, lastUpdatedAt: now };
}
