export type { CustomMapLibrary, CustomMapRecord } from "@/lib/board-game/map/library/types";
export {
  createCustomMapId,
  deleteCustomMap,
  duplicateCustomMap,
  isBuiltInMapId,
  isCustomMapId,
  listCustomMaps,
  readCustomMap,
  readCustomMapLibrary,
  saveCustomMap,
} from "@/lib/board-game/map/library/storage";
export {
  clearPathTileOverrides,
  countPathTileOverrides,
  getPathTileOverride,
  hasPathTileOverrides,
  listPathTileOverrides,
  pathTileGridKey,
  setPathTileOverride,
  type PathTileOverrideEntry,
} from "@/lib/board-game/map/path-tile-overrides";
export {
  clearTerrainTileOverrides,
  countTerrainTileOverrides,
  getTerrainTileOverride,
  hasTerrainTileOverrides,
  listTerrainTileOverrides,
  setTerrainTileOverride,
  type TerrainTileOverrideEntry,
} from "@/lib/board-game/map/terrain-tile-overrides";
export {
  downloadMapExport,
  parseMapImport,
  prepareImportedMap,
  serializeMapExport,
  type ExportedMapFile,
  type ImportMapResult,
} from "@/lib/board-game/map/library/export-map";
export {
  pathTileAtCell,
  pathTileAtSpace,
  pathTileAtSpaceId,
  type PathTileAtCell,
} from "@/lib/board-game/map/path-tile-at-cell";
export {
  terrainTileAtCell,
  terrainTileAtSpace,
  type TerrainTileAtCell,
} from "@/lib/board-game/map/terrain-tile-at-cell";
export {
  addConnectionByPathIndex,
  cloneMapAsCustom,
  createMapFromOptions,
  isMapDirty,
  listConnectionOptions,
  mapSnapshot,
  removeConnection,
  updateMapMeta,
  updateSpace,
} from "@/lib/board-game/map/library/map-mutations";
export {
  BUILDER_CONNECTION_TYPES,
  BUILDER_CORRECT_PRESETS,
  BUILDER_EFFECTS,
  BUILDER_ICONS,
  BUILDER_LAYOUTS,
  BUILDER_SPACE_COUNTS,
  BUILDER_SPACE_TYPES,
  BUILDER_THEMES,
  BUILDER_WRONG_PRESETS,
  defaultEffectsForSpaceType,
  defaultIconForSpaceType,
} from "@/lib/board-game/map/library/builder-defaults";
