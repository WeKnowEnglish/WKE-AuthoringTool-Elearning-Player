export type { BoardTilemap } from "@/lib/board-game/render/board-tilemap-types";
export { boardLengthFromMap, buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
export {
  boardTilemapCanvasSize,
  boardTilemapGridStyle,
  boardTilemapLayoutForTheme,
  boardTilemapLayoutFromTilemap,
  type BoardTilemapLayout,
} from "@/lib/board-game/render/board-tilemap-layout";
export {
  resolveTilemapSprites,
  spriteFromTilemapCache,
  type ResolvedTilemapSprites,
} from "@/lib/board-game/render/board-tilemap-sprites";
export { buildPathIndexGrid, type PathIndexGrid } from "@/lib/board-game/render/path-index-grid";
export {
  FAMILY_TILES,
  fillerTileForTheme,
  spriteForBoardPathTile,
  terrainFamilyForTheme,
  terrainTileForPathCell,
  type PathTerrainDecoration,
  type TerrainFamily,
} from "@/lib/board-game/render/terrain-tiles";
export { BOARD_WKE_SPRITES_ENABLED } from "@/lib/board-game/render/feature-flags";
export {
  assertBoardTilemapResolvable,
  BOARD_TILE_LOGICAL_PX,
  resolvePathTile,
  resolveTerrainTile,
  type BoardAtlasId,
  type ResolvedBoardSprite,
} from "@/lib/topdown/resolve-sprite-bounds";
