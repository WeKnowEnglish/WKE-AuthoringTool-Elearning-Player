"use client";

import { memo } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import type { LiveGameTilemapDef } from "@/lib/live-game/modes/types";
import {
  GRASS_TILE_NATIVE_PX,
  GRASS_TILE_SIZE_PX,
  GRASS_TILE_SRC,
  LIVE_GAME_GROUND_COLOR,
  grassTileRowStridePx,
  grassTilemapHeightPx,
  grassTilemapWidthPx,
  type GrassTileId,
} from "@/lib/live-game/tiles/grass-tile-pack";
import { grassTileKey } from "@/lib/live-game/tiles/tile-step";

type Props = {
  tilemap: LiveGameTilemapDef;
  className?: string;
  bouncingTiles?: Record<string, number>;
};

export const GrassTilemapLayer = memo(GrassTilemapLayerInner);

function GrassTilemapLayerInner({ tilemap, className, bouncingTiles = {} }: Props) {
  const { cols, rows, cells } = tilemap;
  const mapW = grassTilemapWidthPx(cols);
  const mapH = grassTilemapHeightPx(rows);
  const rowStride = grassTileRowStridePx();

  return (
    <div
      className={clsx("absolute inset-0 overflow-hidden", className)}
      style={{ backgroundColor: LIVE_GAME_GROUND_COLOR }}
      aria-hidden
    >
      <div className="relative h-full w-full">
        {cells.flatMap((row, rowIndex) =>
          row.map((tileId, colIndex) => {
            const key = grassTileKey(colIndex, rowIndex);
            const bounceToken = bouncingTiles[key];
            return (
              <div
                key={key}
                className="absolute overflow-visible"
                style={{
                  left: `${(colIndex * GRASS_TILE_SIZE_PX / mapW) * 100}%`,
                  top: `${(rowIndex * rowStride / mapH) * 100}%`,
                  width: `${(GRASS_TILE_SIZE_PX / mapW) * 100}%`,
                  height: `${(GRASS_TILE_SIZE_PX / mapH) * 100}%`,
                  zIndex: rowIndex + 1,
                }}
              >
                {tileId ?
                  <GrassTileCell tileId={tileId} bounceToken={bounceToken} />
                : <div className="h-full w-full bg-sky-400/80" />}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function GrassTileCell({
  tileId,
  bounceToken,
}: {
  tileId: GrassTileId;
  bounceToken?: number;
}) {
  return (
    <div
      key={bounceToken ?? 0}
      className={clsx(
        "relative h-full w-full overflow-visible",
        bounceToken && "live-game-grass-tile-bounce",
      )}
    >
      <Image
        src={GRASS_TILE_SRC[tileId]}
        alt=""
        width={GRASS_TILE_NATIVE_PX.w}
        height={GRASS_TILE_NATIVE_PX.h}
        className="absolute bottom-0 left-0 h-auto w-full max-w-none"
        sizes={`${GRASS_TILE_SIZE_PX}px`}
        unoptimized
        draggable={false}
      />
    </div>
  );
}
