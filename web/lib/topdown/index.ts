export type {
  SpriteAtlasAssetMap,
  SpriteAtlasConfig,
  SpriteCategory,
  SpriteFrame,
  SpriteFrameDef,
  SpriteRect,
} from "@/lib/topdown/types";

export {
  EMPTY_PLOT_SPRITE,
  FENCE_FRAMES,
  formatSpriteFrameLabel,
  GARDEN_ITEM_FRAMES,
  GARDEN_ITEM_SPRITES,
  GARDEN_SPRITE_ATLAS,
  getSpriteFrameById,
  getSpriteRect,
  GRASS_TILE_FRAMES,
  PLANT_STAGE_FRAMES,
  PLANT_STAGE_SPRITES,
  SOIL_TILE_FRAMES,
  SPRITE_ATLAS,
  SPRITE_FRAME_BY_ID,
  SPRITE_FRAME_CATALOG,
  SPRITE_FRAMES_BY_CATEGORY,
  SPRITE_SHEET_HEIGHT,
  SPRITE_SHEET_ID,
  SPRITE_SHEET_URL,
  SPRITE_SHEET_WIDTH,
  WEED_MONSTER_FRAME,
  WEED_MONSTER_SPRITE,
} from "@/lib/topdown/garden-sprite-atlas";

export type {
  FenceSpriteId,
  GardenItemSpriteId,
  GrassTileId,
  PlantStageId,
  SoilTileId,
  SpriteAtlasAssetKey,
  SpriteFrameId,
  WeedSpriteId,
} from "@/lib/topdown/garden-sprite-atlas";

export {
  WKE_PATH_SPRITE_ATLAS,
  WKE_SPRITE_ATLASES,
  WKE_TERRAIN_SPRITE_ATLAS,
} from "@/lib/topdown/wke-sprite-atlas";

export type { WkePathTileId, WkeTerrainTileId } from "@/lib/topdown/wke-sprite-atlas";

export {
  atlasCropBackgroundStyleScaled,
  atlasCropLayerStyle,
  getAtlasRect,
  snapDetectedBoundsToCanonical,
  spriteBackgroundPosition,
  spriteBackgroundPositionScaled,
  spriteBackgroundSize,
  spriteBackgroundSizeScaled,
  spriteScaleToWidth,
  spriteScaleToFit,
} from "@/lib/topdown/sprite-utils";

export {
  GARDEN_SEAMLESS_MAP_TILES,
  SEAMLESS_MAP_PREVIEWS,
  SEAMLESS_MAP_TILE_PX,
  WKE_PATH_SEAMLESS_MAP_TILES,
  WKE_TERRAIN_SEAMLESS_MAP_TILES,
} from "@/lib/topdown/preview-seamless-maps";

export type {
  GardenMapSnippetTileKey,
  SeamlessMapPreviewDef,
} from "@/lib/topdown/preview-seamless-maps";

export {
  MAP_SNIPPET_LEGEND,
  MAP_SNIPPET_TILE_PX,
  MAP_SNIPPET_TILE_TO_FRAME_ID,
  MOCK_MAP_TILES,
} from "@/lib/topdown/preview-seamless-maps";

export type {
  MapSnippetTileKey,
  MockPlotCell,
  MockPlotState,
} from "@/lib/topdown/preview-mock-data";

export {
  MOCK_GARDEN_GRID_COLS,
  MOCK_GARDEN_GRID_ROWS,
  MOCK_GARDEN_PLOTS,
  MOCK_HUD,
  PREVIEW_ATLAS_CARD_PX,
  PREVIEW_PLOT_DISPLAY_PX,
  PREVIEW_TOOL_ICON_PX,
} from "@/lib/topdown/preview-mock-data";

export {
  getIndividualTile,
  INDIVIDUAL_TILE_BY_ID,
  INDIVIDUAL_TILE_COLUMN_OVERLAP_PX,
  INDIVIDUAL_TILE_LIP_OVERLAP_PX,
  INDIVIDUAL_TILE_LOGICAL_PX,
  INDIVIDUAL_TILES,
  presetExportName,
} from "@/lib/topdown/individual-tiles";

export type {
  IndividualTileDef,
  TileLayoutPreset,
  TileRect,
} from "@/lib/topdown/individual-tiles";

export {
  clampTileRect,
  columnStridePx,
  computeStackedSpritePlacement,
  formatTilePresetTs,
  rowStridePx,
} from "@/lib/topdown/stacked-individual-layout";

export { DIRT_1_PRESET } from "@/lib/topdown/tile-presets/dirt_1";
export { DIRT_TILLED_PRESET } from "@/lib/topdown/tile-presets/dirt_tilled";
export { GRASS_1_PRESET } from "@/lib/topdown/tile-presets/grass_1";

export {
  LETTER_FRUIT_PLOT_STAGES,
  PILOT_GARDEN_MAPS,
  PILOT_MAP_LAYOUT,
  PILOT_MAP_TILES,
} from "@/lib/topdown/preview-individual-map";

export type {
  LetterFruitPlotStageId,
  PilotGardenMapDef,
  PilotMapTileId,
} from "@/lib/topdown/preview-individual-map";

export {
  computeWeedMonsterPlotPlacement,
  WEED_MONSTER_PLOT_LAYER,
} from "@/lib/topdown/weed-monster-plot";

export {
  mockPlotStateToIndividualTileId,
  plotToIndividualTileId,
  PLOT_TILE_THRESHOLDS,
  resolvePlotVisual,
} from "@/lib/topdown/plot-to-individual-tile";

export type {
  PlotBaseTileId,
  PlotTileLookupInput,
  PlotVisual,
  PlotVisualOverlays,
} from "@/lib/topdown/plot-to-individual-tile";


