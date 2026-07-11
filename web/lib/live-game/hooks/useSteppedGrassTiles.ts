"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveGameTilemapDef } from "@/lib/live-game/modes/types";
import {
  grassTileAtPlayerFeet,
  grassTileKey,
  isGrassTileAt,
} from "@/lib/live-game/tiles/tile-step";

export type GrassTileWalker = {
  id: string;
  x: number;
  y: number;
};

/** Tile keys currently playing the step bounce (value = animation token). */
export function useSteppedGrassTiles(
  tilemap: LiveGameTilemapDef | undefined,
  walkers: GrassTileWalker[],
): Record<string, number> {
  const [bouncingTiles, setBouncingTiles] = useState<Record<string, number>>({});
  const lastTileByWalkerRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!tilemap) return;

    const { cols, rows } = tilemap;
    const nextBounces: Record<string, number> = {};

    for (const walker of walkers) {
      const tile = grassTileAtPlayerFeet(cols, rows, walker.x, walker.y);
      if (!tile) continue;

      const key = grassTileKey(tile.col, tile.row);
      const lastKey = lastTileByWalkerRef.current.get(walker.id);

      if (lastKey === undefined) {
        lastTileByWalkerRef.current.set(walker.id, key);
        continue;
      }

      if (lastKey !== key && isGrassTileAt(tilemap, tile.col, tile.row)) {
        lastTileByWalkerRef.current.set(walker.id, key);
        nextBounces[key] = Date.now();
      }
    }

    if (Object.keys(nextBounces).length === 0) return;

    setBouncingTiles((prev) => ({ ...prev, ...nextBounces }));
  }, [tilemap, walkers]);

  return bouncingTiles;
}
