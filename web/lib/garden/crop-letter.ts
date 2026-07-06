import {
  buildHarvestWeights,
  pickWeightedLetter,
} from "@/lib/garden/harvest-weights";
import type { FarmPlot, GardenSnapshotV1 } from "@/lib/garden/types";
import {
  LETTER_FRUIT_SLUGS,
  type LetterFruitSlug,
} from "@/lib/topdown/letter-fruit-variants";

const LETTER_RE = /^[A-Z]$/;

export function normalizeCropLetter(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const letter = raw.trim().toUpperCase();
  return LETTER_RE.test(letter) ? letter : null;
}

export function normalizeFruitSlug(raw: unknown): LetterFruitSlug | null {
  if (typeof raw !== "string") return null;
  return LETTER_FRUIT_SLUGS.includes(raw as LetterFruitSlug) ?
      (raw as LetterFruitSlug)
    : null;
}

/** Deterministic RNG for stable backfill across reloads. */
export function deterministicRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0 || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function plotCropIdentitySeed(plot: FarmPlot): string {
  return `${plot.row},${plot.col},${plot.plantedAt ?? 0},${plot.seedId ?? ""}`;
}

export function rollCropLetter(
  snapshot: GardenSnapshotV1,
  rng: () => number = Math.random,
): string {
  return pickWeightedLetter(buildHarvestWeights(snapshot), rng);
}

export function fruitSlugForCropLetter(
  letter: string,
  rng: () => number = Math.random,
): LetterFruitSlug {
  const ch = letter.toUpperCase();
  if (ch === "J") return rng() < 0.5 ? "j_green" : "j_red";
  const slug = ch.toLowerCase();
  if (LETTER_FRUIT_SLUGS.includes(slug as LetterFruitSlug)) {
    return slug as LetterFruitSlug;
  }
  return "a";
}

export function assignCropIdentity(
  snapshot: GardenSnapshotV1,
  rng: () => number = Math.random,
): { cropLetter: string; fruitSlug: LetterFruitSlug } {
  const cropLetter = rollCropLetter(snapshot, rng);
  const fruitSlug = fruitSlugForCropLetter(cropLetter, rng);
  return { cropLetter, fruitSlug };
}

export function ensurePlotCropIdentity(
  plot: FarmPlot,
  snapshot: GardenSnapshotV1,
): Pick<FarmPlot, "cropLetter" | "fruitSlug"> {
  if (!plot.seedId || plot.plantedAt == null) {
    return { cropLetter: null, fruitSlug: null };
  }

  const cropLetter = plot.cropLetter ?? null;
  const fruitSlug = plot.fruitSlug ?? null;

  if (cropLetter && fruitSlug) {
    return { cropLetter, fruitSlug };
  }

  const rng = deterministicRng(plotCropIdentitySeed(plot));
  const resolvedLetter = cropLetter ?? rollCropLetter(snapshot, rng);
  const resolvedSlug = fruitSlug ?? fruitSlugForCropLetter(resolvedLetter, rng);
  return { cropLetter: resolvedLetter, fruitSlug: resolvedSlug };
}

export function backfillPlotCropIdentities(
  snapshot: GardenSnapshotV1,
): GardenSnapshotV1 {
  let changed = false;
  const plots = snapshot.plots.map((plot) => {
    const identity = ensurePlotCropIdentity(plot, snapshot);
    if (
      identity.cropLetter === (plot.cropLetter ?? null) &&
      identity.fruitSlug === (plot.fruitSlug ?? null)
    ) {
      return plot;
    }
    changed = true;
    return { ...plot, ...identity };
  });
  return changed ? { ...snapshot, plots } : snapshot;
}
