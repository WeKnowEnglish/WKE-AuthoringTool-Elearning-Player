import { setGardenSnapshot } from "@/lib/garden/storage";
import {
  canPurchasePlotAt,
  getPurchasedPlotKeys,
  isGrassCell,
  isPlotUnlocked,
  nextGrassPlotCost,
  plotKey,
} from "@/lib/garden/plot-unlock";
import { plotAt } from "@/lib/garden/actions";
import type { GardenSnapshotV1 } from "@/lib/garden/types";
import { spendGold } from "@/lib/progress/rewards";

export type PurchaseGrassPlotResult =
  | {
      ok: true;
      snapshot: GardenSnapshotV1;
      cost: number;
      goldRemaining: number;
      plotKey: string;
    }
  | {
      ok: false;
      reason:
        | "plot_missing"
        | "not_grass"
        | "already_unlocked"
        | "all_purchased"
        | "insufficient_gold";
      cost?: number;
    };

export function purchaseGrassPlotAt(
  snapshot: GardenSnapshotV1,
  row: number,
  col: number,
  now = Date.now(),
): PurchaseGrassPlotResult {
  const plot = plotAt(snapshot, row, col);
  if (!plot) return { ok: false, reason: "plot_missing" };

  if (!isGrassCell(row, col)) return { ok: false, reason: "not_grass" };
  if (isPlotUnlocked(snapshot, row, col)) return { ok: false, reason: "already_unlocked" };

  const cost = nextGrassPlotCost(snapshot);
  if (cost == null) return { ok: false, reason: "all_purchased" };

  const rewards = spendGold(cost);
  if (!rewards) return { ok: false, reason: "insufficient_gold", cost };

  const key = plotKey(row, col);
  const purchasedPlotKeys = [...getPurchasedPlotKeys(snapshot), key];
  const nextSnapshot = setGardenSnapshot({
    ...snapshot,
    purchasedPlotKeys,
    lastUpdatedAt: now,
  });

  return {
    ok: true,
    snapshot: nextSnapshot,
    cost,
    goldRemaining: rewards.gold,
    plotKey: key,
  };
}
