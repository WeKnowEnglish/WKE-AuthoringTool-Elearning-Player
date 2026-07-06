import type { CSSProperties } from "react";
import type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
import { fillerTileForTheme } from "@/lib/board-game/render/terrain-tiles";
import type { MapThemeId } from "@/lib/board-game/map/types";
import {
  columnStridePx,
  rowStridePx,
} from "@/lib/topdown/stacked-individual-layout";
import {
  resolveTerrainTile,
  type ResolvedBoardSprite,
} from "@/lib/topdown/resolve-sprite-bounds";

export type BoardTilemapLayout = {
  colStride: number;
  rowStride: number;
  logicalTilePx: number;
  referenceSprite: ResolvedBoardSprite;
};

export function boardTilemapLayoutForTheme(theme: MapThemeId): BoardTilemapLayout {
  const referenceSprite = resolveTerrainTile(fillerTileForTheme(theme));
  const preset = referenceSprite.stack.layout;
  return {
    colStride: columnStridePx(preset),
    rowStride: rowStridePx(preset),
    logicalTilePx: preset.logicalTilePx,
    referenceSprite,
  };
}

export function boardTilemapLayoutFromTilemap(
  tilemap: BoardTilemap,
  theme: MapThemeId,
): BoardTilemapLayout & { cols: number; rows: number } {
  const layout = boardTilemapLayoutForTheme(theme);
  return {
    ...layout,
    cols: tilemap.cols,
    rows: tilemap.rows,
  };
}

export function boardTilemapGridStyle(
  cols: number,
  layout: Pick<BoardTilemapLayout, "colStride" | "rowStride">,
): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${layout.colStride}px)`,
    gridAutoRows: `${layout.rowStride}px`,
    gap: 0,
    lineHeight: 0,
  };
}

export function boardTilemapCanvasSize(
  cols: number,
  rows: number,
  layout: Pick<BoardTilemapLayout, "colStride" | "rowStride">,
): { width: number; height: number } {
  return {
    width: cols * layout.colStride,
    height: rows * layout.rowStride,
  };
}
