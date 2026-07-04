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
