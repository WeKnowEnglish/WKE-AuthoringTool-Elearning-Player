"use client";

import { clsx } from "clsx";
import { BoardStackedSpriteCell } from "@/components/board-game/render/BoardStackedSpriteCell";
import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import {
  spriteFromTilemapCache,
  type ResolvedTilemapSprites,
} from "@/lib/board-game/render/board-tilemap-sprites";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  col: number;
  row: number;
  tilemap: BoardTilemap;
  spriteCache: ResolvedTilemapSprites;
  spaceOverlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function BoardGridCell({
  col,
  row,
  tilemap,
  spriteCache,
  spaceOverlay,
  className,
  style,
}: Props) {
  const terrainId = tilemap.terrain[row]?.[col];
  const pathId = tilemap.path[row]?.[col] ?? null;
  if (!terrainId) return null;

  const terrain = spriteFromTilemapCache(spriteCache, terrainId);
  const path = pathId ? spriteFromTilemapCache(spriteCache, pathId) : null;

  return (
    <div
      className={clsx("relative overflow-visible", className)}
      style={{ ...style, zIndex: row }}
    >
      <BoardStackedSpriteCell sprite={terrain} />
      {path ?
        <div className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 1 }}>
          <BoardStackedSpriteCell sprite={path} />
        </div>
      : null}
      {spaceOverlay ?
        <div className="absolute inset-0 z-10">{spaceOverlay}</div>
      : null}
    </div>
  );
}