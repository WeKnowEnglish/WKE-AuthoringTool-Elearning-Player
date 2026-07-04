"use client";

import {
  createEmptyPlots,
  emptyGardenSnapshot,
  GARDEN_GRID_COLS,
  GARDEN_GRID_ROWS,
  GARDEN_STORAGE_KEY,
} from "@/lib/garden/defaults";
import type { FarmPlot, GardenSnapshotV1 } from "@/lib/garden/types";
import { clampSpellingLevel } from "@/lib/garden/spelling-levels";
import { reconcileWeeds } from "@/lib/garden/weeds";

function normalizePlot(raw: unknown, row: number, col: number): FarmPlot {
  const p = raw && typeof raw === "object" ? (raw as FarmPlot) : null;
  const growMultiplier =
    typeof p?.growMultiplier === "number" && p.growMultiplier > 0 ?
      p.growMultiplier
    : 1;
  const fertilizedAt =
    typeof p?.fertilizedAt === "number" && Number.isFinite(p.fertilizedAt) ?
      p.fertilizedAt
    : null;
  const weedWord =
    typeof p?.weedWord === "string" && p.weedWord.length > 0 ? p.weedWord.toUpperCase() : null;
  const weedRollDone = p?.weedRollDone === true;
  return {
    row,
    col,
    seedId: typeof p?.seedId === "string" ? p.seedId : null,
    seedTier: p?.seedTier === "bonus" ? "bonus" : p?.seedTier === "common" ? "common" : null,
    plantedAt:
      typeof p?.plantedAt === "number" && Number.isFinite(p.plantedAt) ?
        p.plantedAt
      : null,
    growMultiplier,
    fertilizedAt,
    weedWord,
    weedRollDone,
  };
}

function normalizeSnapshot(raw: unknown): GardenSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as GardenSnapshotV1;
  if (r.schemaVersion !== 1 || typeof r.lastUpdatedAt !== "number") return null;

  const gridRows =
    typeof r.gridRows === "number" && r.gridRows > 0 ? r.gridRows : GARDEN_GRID_ROWS;
  const gridCols =
    typeof r.gridCols === "number" && r.gridCols > 0 ? r.gridCols : GARDEN_GRID_COLS;

  const plots: FarmPlot[] = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const existing = Array.isArray(r.plots) ?
        r.plots.find((p) => p.row === row && p.col === col)
      : undefined;
      plots.push(normalizePlot(existing, row, col));
    }
  }

  const seedPouch = Array.isArray(r.seedPouch) ?
    r.seedPouch
      .filter(
        (s) =>
          s &&
          typeof s === "object" &&
          typeof s.id === "string" &&
          typeof s.sourceEventId === "string",
      )
      .map((s) => ({
        id: s.id,
        tier: s.tier === "bonus" ? ("bonus" as const) : ("common" as const),
        grantedAt: typeof s.grantedAt === "number" ? s.grantedAt : Date.now(),
        sourceEventId: s.sourceEventId,
      }))
  : [];

  const letters: GardenSnapshotV1["letters"] = {};
  if (r.letters && typeof r.letters === "object") {
    for (const [ch, count] of Object.entries(r.letters)) {
      if (typeof count === "number" && count > 0) {
        letters[ch.toUpperCase()] = Math.floor(count);
      }
    }
  }

  const items: GardenSnapshotV1["items"] = {};
  if (r.items && typeof r.items === "object") {
    for (const id of ["watering_can", "fertilizer"] as const) {
      const count = r.items[id];
      if (typeof count === "number" && count > 0) {
        items[id] = Math.floor(count);
      }
    }
  }

  const spelledWords = Array.isArray(r.spelledWords) ?
    r.spelledWords.filter((w) => typeof w === "string").map((w) => w.toUpperCase())
  : [];

  const spellingLevel = clampSpellingLevel(r.spellingLevel);
  const spelledAtLevel = Array.isArray(r.spelledAtLevel) ?
    r.spelledAtLevel.filter((w) => typeof w === "string").map((w) => w.toUpperCase())
  : [];

  // Players who finished Sprout before the watering-can redesign keep their unlock.
  if (spellingLevel > 1 && !items.watering_can) {
    items.watering_can = 1;
  }

  // Players who finished Bud before fertilizer redesign keep their unlock.
  if (spellingLevel > 2 && !items.fertilizer) {
    items.fertilizer = 1;
  }

  const lastWateringCanUsedAt =
    typeof r.lastWateringCanUsedAt === "number" && Number.isFinite(r.lastWateringCanUsedAt) ?
      r.lastWateringCanUsedAt
    : undefined;

  const lastFertilizerUsedAt =
    typeof r.lastFertilizerUsedAt === "number" && Number.isFinite(r.lastFertilizerUsedAt) ?
      r.lastFertilizerUsedAt
    : undefined;

  const totalHarvests =
    typeof r.totalHarvests === "number" && Number.isFinite(r.totalHarvests) ?
      Math.max(0, Math.floor(r.totalHarvests))
    : 0;

  return {
    schemaVersion: 1,
    lastUpdatedAt: r.lastUpdatedAt,
    gridRows,
    gridCols,
    plots: plots.length > 0 ? plots : createEmptyPlots(gridRows, gridCols),
    seedPouch,
    letters,
    items,
    spelledWords,
    spellingLevel,
    spelledAtLevel,
    lastWateringCanUsedAt,
    lastFertilizerUsedAt,
    totalHarvests,
  };
}

function readRaw(): GardenSnapshotV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GARDEN_STORAGE_KEY);
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeRaw(snapshot: GardenSnapshotV1) {
  localStorage.setItem(GARDEN_STORAGE_KEY, JSON.stringify(snapshot));
}

/** Loads garden state from localStorage. Growth is derived from `plantedAt` timestamps. */
export function getGardenSnapshot(): GardenSnapshotV1 {
  if (typeof window === "undefined") {
    return emptyGardenSnapshot();
  }
  const existing = readRaw();
  if (!existing) {
    const fresh = emptyGardenSnapshot();
    writeRaw(fresh);
    return fresh;
  }
  const reconciled = reconcileWeeds(existing);
  if (reconciled !== existing) {
    writeRaw(reconciled);
  }
  return reconciled;
}

export function setGardenSnapshot(snapshot: GardenSnapshotV1): GardenSnapshotV1 {
  const reconciled = reconcileWeeds(snapshot);
  writeRaw(reconciled);
  return reconciled;
}
