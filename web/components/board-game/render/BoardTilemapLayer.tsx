"use client";

import { clsx } from "clsx";
import { BoardStackedSpriteCell } from "@/components/board-game/render/BoardStackedSpriteCell";
import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import {
  boardTilemapGridStyle,
  type BoardTilemapLayout,
} from "@/lib/board-game/render/board-tilemap-layout";
import {
  spriteFromTilemapCache,
  type ResolvedTilemapSprites,
} from "@/lib/board-game/render/board-tilemap-sprites";

type Props = {
  tilemap: BoardTilemap;
  layer: "terrain" | "path";
  spriteCache: ResolvedTilemapSprites;
  layout: BoardTilemapLayout;
  zIndexBase?: number;
  className?: string;
};

export function BoardTilemapLayer({
  tilemap,
  layer,
  spriteCache,
  layout,
  zIndexBase = 0,
  className,
}: Props) {
  return (
    <div
      className={clsx("overflow-visible", className)}
      style={boardTilemapGridStyle(tilemap.cols, layout)}
      aria-hidden
    >
      {tilemap.terrain.flatMap((_, row) =>
        Array.from({ length: tilemap.cols }, (_, col) => {
          const assetId =
            layer === "terrain" ? tilemap.terrain[row]![col]! : tilemap.path[row]![col];
          if (!assetId) return null;

          const sprite = spriteFromTilemapCache(spriteCache, assetId);
          return (
            <div key={`${layer}-${row}-${col}`} style={{ zIndex: zIndexBase + row }}>
              <BoardStackedSpriteCell sprite={sprite} />
            </div>
          );
        }),
      )}
    </div>
  );
}
