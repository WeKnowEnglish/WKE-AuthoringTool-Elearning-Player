export type {
  BoardConnection,
  BoardMap,
  BoardMapSpace,
  GenerateMapOptions,
  MapLayoutTemplate,
  MapSpaceEffect,
  MapSpaceType,
  MapThemeId,
} from "@/lib/board-game/map/types";

export { generateBoardMap, gridBoundsForMap, gridBoundsForTemplate, pathIndexFromSpaceId, spaceAtPathIndex, spaceById } from "@/lib/board-game/map/generate-map";
export { MAP_PRESET_CATALOG, DEFAULT_MAPS, getDefaultMapForPathStyle, getMapById, listDefaultMaps, getPresetById, defaultMapIdForPathStyle } from "@/lib/board-game/map/default-maps";
export { boardLengthFromMap, mapToRuntimeSpaces } from "@/lib/board-game/map/map-to-runtime";
export { boardLengthForSetup, resolveMapForPathStyle, resolveMapForSetup } from "@/lib/board-game/map/resolve-map";
export { boardMapSchema, parseBoardMap, validateBoardMap } from "@/lib/board-game/map/schema";
export {
  applyResolvedEffect,
  connectionLabel,
  feedbackForResolvedEffect,
  planLandingSequence,
  resolveConnectionOnLand,
  resolveLandEffect,
  shouldAskQuestion,
} from "@/lib/board-game/map/effects";
