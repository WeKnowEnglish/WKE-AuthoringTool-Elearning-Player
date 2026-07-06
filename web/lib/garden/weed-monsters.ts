/**
 * Weed monsters spawn on empty unlocked plots after a harvest grace period.
 * Spawn rate scales with how many plots are empty; at most {@link WEED_MONSTER_MAX_ACTIVE}
 * monsters are active at once. Each monster is a timed 3-word letter-sort battle.
 */
import {
  WEED_MONSTER_BASE_SPAWN_CHANCE,
  WEED_MONSTER_EMPTY_BOOST_MAX,
  WEED_MONSTER_EMPTY_BOOST_MIN,
  WEED_MONSTER_GRACE_HARVESTS,
  WEED_MONSTER_MAX_ACTIVE,
  WEED_MONSTER_WORD_LENGTH,
} from "@/lib/garden/defaults";
import { resolveGrowthStage } from "@/lib/garden/growth";
import { isPlotUnlocked } from "@/lib/garden/plot-unlock";
import { GARDEN_SPELLING_LEVEL_IDS, getGardenSpellingLevel } from "@/lib/garden/spelling-levels";
import type { FarmPlot, GardenSnapshotV1, WeedMonsterPuzzle } from "@/lib/garden/types";

export function plotHasWeedMonster(plot: FarmPlot): boolean {
  return plot.weedMonster != null;
}

/** @deprecated Use plotHasWeedMonster */
export const plotHasWeed = plotHasWeedMonster;

export function countActiveWeedMonsters(plots: FarmPlot[]): number {
  return plots.filter(plotHasWeedMonster).length;
}

/** @deprecated Use countActiveWeedMonsters */
export const countActiveWeeds = countActiveWeedMonsters;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

function threeLetterWordPool(snapshot: GardenSnapshotV1): string[] {
  const level = getGardenSpellingLevel(snapshot.spellingLevel);
  const fromLevel = level.words.filter((w) => w.length === WEED_MONSTER_WORD_LENGTH);
  if (fromLevel.length >= 3) {
    return [...new Set(fromLevel.map((w) => w.toUpperCase()))];
  }

  const pool = new Set<string>();
  for (const id of GARDEN_SPELLING_LEVEL_IDS) {
    for (const w of getGardenSpellingLevel(id).words) {
      if (w.length === WEED_MONSTER_WORD_LENGTH) pool.add(w.toUpperCase());
    }
  }
  return [...pool];
}

function pickDistinct<T>(pool: T[], count: number, rng: () => number): T[] | null {
  if (pool.length < count) return null;
  const copy = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * copy.length);
    picked.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return picked;
}

function uniqueLetterCount(words: [string, string, string]): number {
  return new Set(words.join("").split("")).size;
}

export function pickWeedMonsterWords(
  snapshot: GardenSnapshotV1,
  rng: () => number = Math.random,
): [string, string, string] | null {
  const pool = threeLetterWordPool(snapshot);
  if (pool.length < 3) return null;

  for (let attempt = 0; attempt < 200; attempt++) {
    const picked = pickDistinct(pool, 3, rng);
    if (!picked) return null;
    const tuple = picked as [string, string, string];
    if (uniqueLetterCount(tuple) === 9) return tuple;
  }

  const picked = pickDistinct(pool, 3, rng);
  if (!picked) return null;
  return picked as [string, string, string];
}

export function buildWeedMonsterPuzzle(
  words: [string, string, string],
  row: number,
  col: number,
  now: number,
  rng: () => number = Math.random,
): WeedMonsterPuzzle {
  const letters = words.join("").split("");
  return {
    puzzleId: `weed:${row},${col}:${now}`,
    words,
    letterTray: shuffle(letters, rng),
  };
}

export function pickWeedMonsterPuzzle(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now: number,
  rng: () => number = Math.random,
): WeedMonsterPuzzle | null {
  const words = pickWeedMonsterWords(snapshot, rng);
  if (!words) return null;
  return buildWeedMonsterPuzzle(words, row, col, now, rng);
}

function emptyUnlockedPlots(snapshot: GardenSnapshotV1, now: number): FarmPlot[] {
  return snapshot.plots.filter((plot) => {
    if (!isPlotUnlocked(snapshot, plot.row, plot.col)) return false;
    if (plot.seedId) return false;
    return resolveGrowthStage(plot, now, plot.seedTier ?? "common") === "empty";
  });
}

function unlockedPlotCount(snapshot: GardenSnapshotV1): number {
  return snapshot.plots.filter((p) => isPlotUnlocked(snapshot, p.row, p.col)).length;
}

export function weedMonsterEmptyRatio(snapshot: GardenSnapshotV1, now = Date.now()): number {
  const unlocked = unlockedPlotCount(snapshot);
  if (unlocked === 0) return 0;
  return emptyUnlockedPlots(snapshot, now).length / unlocked;
}

export function weedMonsterSpawnChance(emptyRatio: number): number {
  const boost = lerp(WEED_MONSTER_EMPTY_BOOST_MIN, WEED_MONSTER_EMPTY_BOOST_MAX, emptyRatio);
  return WEED_MONSTER_BASE_SPAWN_CHANCE * boost;
}

export function normalizeWeedMonsterPuzzle(raw: unknown): WeedMonsterPuzzle | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as WeedMonsterPuzzle;
  if (typeof m.puzzleId !== "string" || m.puzzleId.length === 0) return null;
  if (!Array.isArray(m.words) || m.words.length !== 3) return null;
  const words = m.words.map((w) => (typeof w === "string" ? w.toUpperCase() : "")) as [
    string,
    string,
    string,
  ];
  if (words.some((w) => w.length !== WEED_MONSTER_WORD_LENGTH)) return null;
  if (!Array.isArray(m.letterTray) || m.letterTray.length !== 9) return null;
  const letterTray = m.letterTray.map((c) => (typeof c === "string" ? c.toUpperCase() : ""));
  if (letterTray.some((c) => c.length !== 1)) return null;
  const cooldownUntil =
    typeof m.cooldownUntil === "number" && Number.isFinite(m.cooldownUntil) ?
      m.cooldownUntil
    : undefined;
  const battleStartedAt =
    typeof m.battleStartedAt === "number" && Number.isFinite(m.battleStartedAt) ?
      m.battleStartedAt
    : undefined;
  return { puzzleId: m.puzzleId, words, letterTray, cooldownUntil, battleStartedAt };
}

function stripMonsterFromPlantedPlot(plot: FarmPlot): FarmPlot {
  if (plot.seedId && plot.weedMonster) {
    const { weedMonster: _, ...rest } = plot;
    return rest as FarmPlot;
  }
  return plot;
}

/** Read-time reconciliation: spawn weed monsters on empty unlocked plots. Pure — returns new snapshot. */
export function reconcileWeedMonsters(
  snapshot: GardenSnapshotV1,
  now = Date.now(),
  rng: () => number = Math.random,
): GardenSnapshotV1 {
  const totalHarvests = snapshot.totalHarvests ?? 0;
  let activeMonsters = countActiveWeedMonsters(snapshot.plots);
  let changed = false;

  let plots = snapshot.plots.map((plot) => {
    const normalized = stripMonsterFromPlantedPlot(plot);
    if (normalized !== plot) {
      changed = true;
      activeMonsters = Math.max(0, activeMonsters - 1);
    }
    return normalized;
  });

  const ratio = weedMonsterEmptyRatio(snapshot, now);
  const spawnChance = weedMonsterSpawnChance(ratio);
  const inGrace = totalHarvests < WEED_MONSTER_GRACE_HARVESTS;

  plots = plots.map((plot) => {
    if (!isPlotUnlocked(snapshot, plot.row, plot.col)) return plot;
    if (plot.seedId) return plot;
    const stage = resolveGrowthStage(plot, now, plot.seedTier ?? "common");
    if (stage !== "empty") return plot;
    if (plot.weedMonster) return plot;

    if (inGrace) return plot;
    if (activeMonsters >= WEED_MONSTER_MAX_ACTIVE) return plot;
    if (rng() >= spawnChance) return plot;

    const puzzle = pickWeedMonsterPuzzle(snapshot, plot.row, plot.col, now, rng);
    if (!puzzle) return plot;

    changed = true;
    activeMonsters += 1;
    return { ...plot, weedMonster: puzzle };
  });

  if (!changed) return snapshot;
  return { ...snapshot, plots, lastUpdatedAt: now };
}

/** @deprecated Use reconcileWeedMonsters */
export const reconcileWeeds = reconcileWeedMonsters;
