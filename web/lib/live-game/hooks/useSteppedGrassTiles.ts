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

const GRASS_BOUNCE_LIFETIME_MS = 450;

/** Tile keys currently playing the step bounce (value = animation token). */
export function useSteppedGrassTiles(
  tilemap: LiveGameTilemapDef | undefined,
  walkers: GrassTileWalker[],
): Record<string, number> {
  const [bouncingTiles, setBouncingTiles] = useState<Record<string, number>>({});
  const lastTileByWalkerRef = useRef<Map<string, string>>(new Map());
  const cleanupTimersRef = useRef<Set<number>>(new Set());

  useEffect(
    () => () => {
      for (const timer of cleanupTimersRef.current) window.clearTimeout(timer);
      cleanupTimersRef.current.clear();
    },
    [],
  );

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

    const startTimer = window.setTimeout(() => {
      setBouncingTiles((prev) => ({ ...prev, ...nextBounces }));
      cleanupTimersRef.current.delete(startTimer);
    }, 0);
    cleanupTimersRef.current.add(startTimer);

    const cleanupTimer = window.setTimeout(() => {
      setBouncingTiles((current) => {
        const next = { ...current };
        for (const [key, token] of Object.entries(nextBounces)) {
          if (next[key] === token) delete next[key];
        }
        return next;
      });
      cleanupTimersRef.current.delete(cleanupTimer);
    }, GRASS_BOUNCE_LIFETIME_MS);
    cleanupTimersRef.current.add(cleanupTimer);
  }, [tilemap, walkers]);

  return bouncingTiles;
}
