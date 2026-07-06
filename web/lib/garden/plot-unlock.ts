import {
  GARDEN_FREE_DIRT_ROW,
  GARDEN_GRASS_PLOT_COUNT,
  GARDEN_GRASS_ROW_MIN,
  GARDEN_GRID_COLS,
  GARDEN_GRID_ROWS,
  PLOT_PURCHASE_BASE_GOLD,
} from "@/lib/garden/defaults";
import type { FarmPlot, GardenSnapshotV1 } from "@/lib/garden/types";

function plotAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
): FarmPlot | undefined {
  return snapshot.plots.find((p) => p.row === row && p.col === col);
}

export function plotKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function parsePlotKey(key: string): { row: number; col: number } | null {
  const parts = key.split(",");
  if (parts.length !== 2) return null;
  const row = Number(parts[0]);
  const col = Number(parts[1]);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  if (row < 0 || row >= GARDEN_GRID_ROWS) return null;
  if (col < 0 || col >= GARDEN_GRID_COLS) return null;
  return { row, col };
}

export function isFreeDirtRow(row: number): boolean {
  return row === GARDEN_FREE_DIRT_ROW;
}

export function isGrassRow(row: number): boolean {
  return row >= GARDEN_GRASS_ROW_MIN;
}

export function isGrassCell(row: number, col: number): boolean {
  return isGrassRow(row) && col >= 0 && col < GARDEN_GRID_COLS;
}

export function allGrassPlotKeys(): string[] {
  const keys: string[] = [];
  for (let row = GARDEN_GRASS_ROW_MIN; row < GARDEN_GRID_ROWS; row++) {
    for (let col = 0; col < GARDEN_GRID_COLS; col++) {
      keys.push(plotKey(row, col));
    }
  }
  return keys;
}

export function getPurchasedPlotKeys(snapshot: GardenSnapshotV1): readonly string[] {
  return snapshot.purchasedPlotKeys ?? [];
}

export function isPlotUnlocked(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
): boolean {
  if (isFreeDirtRow(row)) return true;
  return getPurchasedPlotKeys(snapshot).includes(plotKey(row, col));
}

export function countPurchasedGrassPlots(snapshot: GardenSnapshotV1): number {
  return getPurchasedPlotKeys(snapshot).filter((key) => {
    const parsed = parsePlotKey(key);
    return parsed != null && isGrassRow(parsed.row);
  }).length;
}

export function allGrassPlotsPurchased(snapshot: GardenSnapshotV1): boolean {
  return countPurchasedGrassPlots(snapshot) >= GARDEN_GRASS_PLOT_COUNT;
}

export function grassPlotCostByIndex(purchaseIndex: number): number {
  const index = Math.max(0, Math.min(purchaseIndex, GARDEN_GRASS_PLOT_COUNT - 1));
  return PLOT_PURCHASE_BASE_GOLD * 2 ** index;
}

export function nextGrassPlotCost(snapshot: GardenSnapshotV1): number | null {
  if (allGrassPlotsPurchased(snapshot)) return null;
  return grassPlotCostByIndex(countPurchasedGrassPlots(snapshot));
}

export function canPurchasePlotAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
): boolean {
  if (!plotAt(snapshot, row, col)) return false;
  if (!isGrassCell(row, col)) return false;
  if (isPlotUnlocked(snapshot, row, col)) return false;
  if (allGrassPlotsPurchased(snapshot)) return false;
  return true;
}

export function listLockedGrassPlots(snapshot: GardenSnapshotV1): FarmPlot[] {
  return snapshot.plots.filter(
    (plot) => isGrassRow(plot.row) && !isPlotUnlocked(snapshot, plot.row, plot.col),
  );
}

export function listUnlockedPlots(snapshot: GardenSnapshotV1): FarmPlot[] {
  return snapshot.plots.filter((plot) =>
    isPlotUnlocked(snapshot, plot.row, plot.col),
  );
}

export function formatPlotPurchaseCost(gold: number): string {
  return `${gold}g`;
}

export function normalizePurchasedPlotKeys(
  raw: unknown,
  legacyGrandfather = false,
): string[] {
  if (Array.isArray(raw)) {
    const valid = new Set<string>();
    for (const key of raw) {
      if (typeof key !== "string") continue;
      const parsed = parsePlotKey(key);
      if (!parsed || !isGrassCell(parsed.row, parsed.col)) continue;
      valid.add(plotKey(parsed.row, parsed.col));
    }
    return [...valid];
  }

  if (legacyGrandfather) {
    return allGrassPlotKeys();
  }

  return [];
}
