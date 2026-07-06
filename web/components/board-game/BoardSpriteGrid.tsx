"use client";

import { clsx } from "clsx";
import { useMemo } from "react";
import { BoardGridCell } from "@/components/board-game/BoardGridCell";
import type { BoardTilemapLayout } from "@/lib/board-game/render/board-tilemap-layout";
import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import type { ResolvedTilemapSprites } from "@/lib/board-game/render/board-tilemap-sprites";
import { buildSpaceByCellMap, spaceAtGrid } from "@/lib/board-game/map/space-by-cell";
import { pathIndexFromSpaceId } from "@/lib/board-game/map/generate-map";
import type { BoardMap, BoardMapSpace } from "@/lib/board-game/map/types";
import type { ReactNode } from "react";

type Props = {
  map: BoardMap;
  tilemap: BoardTilemap;
  layout: BoardTilemapLayout;
  spriteCache: ResolvedTilemapSprites;
  fitViewport?: boolean;
  renderSpaceOverlay: (space: BoardMapSpace, pathIndex: number) => ReactNode;
};

export function BoardSpriteGrid({
  map,
  tilemap,
  layout,
  spriteCache,
  fitViewport,
  renderSpaceOverlay,
}: Props) {
  const spaceByCell = useMemo(() => buildSpaceByCellMap(map), [map]);

  return (
    <div
      className={clsx("grid w-max gap-0", fitViewport ? "w-max" : "mx-auto min-w-0")}
      style={{
        gridTemplateColumns: `repeat(${tilemap.cols}, ${layout.colStride}px)`,
        gridAutoRows: `${layout.rowStride}px`,
        lineHeight: 0,
      }}
    >
      {Array.from({ length: tilemap.rows }, (_, row) =>
        Array.from({ length: tilemap.cols }, (_, col) => {
          const space = spaceAtGrid(spaceByCell, col, row);
          const pathIndex = space ? pathIndexFromSpaceId(map, space.id) : -1;

          return (
            <BoardGridCell
              key={`${col}-${row}`}
              col={col}
              row={row}
              tilemap={tilemap}
              spriteCache={spriteCache}
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
              }}
              spaceOverlay={
                space && pathIndex >= 0 ? renderSpaceOverlay(space, pathIndex) : undefined
              }
            />
          );
        }),
      )}
    </div>
  );
}
