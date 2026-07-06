"use client";

import { clsx } from "clsx";
import { useMemo } from "react";
import { BoardTilemapLayer } from "@/components/board-game/render/BoardTilemapLayer";
import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import {
  boardTilemapCanvasSize,
  boardTilemapLayoutForTheme,
} from "@/lib/board-game/render/board-tilemap-layout";
import { resolveTilemapSprites } from "@/lib/board-game/render/board-tilemap-sprites";
import type { MapThemeId } from "@/lib/board-game/map/types";

type Props = {
  tilemap: BoardTilemap;
  theme: MapThemeId;
  tilePx?: number;
  showTerrain?: boolean;
  showPath?: boolean;
  className?: string;
};

export function BoardTilemapCanvas({
  tilemap,
  theme,
  tilePx,
  showTerrain = true,
  showPath = true,
  className,
}: Props) {
  const layout = useMemo(() => boardTilemapLayoutForTheme(theme), [theme]);
  const spriteCache = useMemo(() => resolveTilemapSprites(tilemap), [tilemap]);
  const canvasSize = boardTilemapCanvasSize(tilemap.cols, tilemap.rows, layout);
  const scale = tilePx != null && tilePx > 0 ? tilePx / layout.logicalTilePx : 1;

  return (
    <div
      className={clsx("inline-block overflow-visible bg-[#3a3a3a]", className)}
      style={
        scale === 1 ?
          { width: canvasSize.width, height: canvasSize.height }
        : {
            width: Math.round(canvasSize.width * scale),
            height: Math.round(canvasSize.height * scale),
          }
      }
    >
      <div
        className="relative overflow-visible"
        style={
          scale === 1 ?
            { width: canvasSize.width, height: canvasSize.height }
          : {
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }
        }
      >
        {showTerrain ?
          <BoardTilemapLayer
            tilemap={tilemap}
            layer="terrain"
            spriteCache={spriteCache}
            layout={layout}
            zIndexBase={0}
            className="relative"
          />
        : null}
        {showPath ?
          <BoardTilemapLayer
            tilemap={tilemap}
            layer="path"
            spriteCache={spriteCache}
            layout={layout}
            zIndexBase={100}
            className="pointer-events-none absolute inset-0"
          />
        : null}
      </div>
    </div>
  );
}
