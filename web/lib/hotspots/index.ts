export {
  effectiveZIndex,
  nextZIndex,
  reorderZIndex,
  sortHotspotsBackToFront,
  sortHotspotsFrontToBack,
  type LayerReorderDirection,
} from "./layers";
export type {
  ActivityAssetReference,
  Dialogue,
  DialogueTurn,
  ExploreHotspotsDocument,
  HotspotElement,
  HotspotGeometry,
  HotspotHighlight,
  HotspotVisualShape,
  NormalizedPoint,
} from "./types";
export {
  DEFAULT_OBJECT_HIGHLIGHT,
  detectActivityHotspotContour,
  hotspotGeometryBounds,
  hotspotGeometrySeedPoints,
  type DetectActivityHotspotOptions,
  type DetectActivityHotspotResult,
  type NormalizedSamPrompt,
} from "./hotspotSegmentation";
export { maskToNormalizedContours, contoursToSvgPath } from "./maskContours";
export {
  buildHotspotClipboardPayload,
  imageFileFromClipboardData,
  imageFileFromSystemClipboard,
  insertHotspotClipboardPayload,
  isEditableKeyboardTarget,
  parseHotspotClipboardPayload,
  type HotspotClipboardPayload,
} from "./clipboard";
export {
  downloadExploreHotspotsJson,
  getStudioExploreHotspots,
  listStudioExploreHotspots,
  saveExploreHotspotsToStudio,
  validateExploreHotspotsDocument,
  type StudioExploreHotspotsRef,
} from "./studio";
export {
  applyMediaAssetUrlMap,
  resolveExploreHotspotsMediaUrls,
} from "./resolve-media-asset-urls";
export {
  EXPLORE_HOTSPOTS_WKE_LIBRARY,
  getExploreHotspotsLibraryRef,
  loadExploreHotspotsLibraryExample,
  type WkeLibraryExampleRef,
} from "./wke-library";
export { HOBBIES_HOTSPOT_ACTIVITY } from "./fixtures/hobbiesHotspot";
export { createBlankExploreHotspotsDocument } from "./fixtures/blankExploreHotspots";
export {
  duplicateImageAsset,
  duplicatePhaseInDocument,
  ensurePhases,
  forkPhaseImageAsset,
  hotspotsForPhase,
  movePhase,
  movePhaseInDocument,
  nextPhaseId,
  nextPhaseImageAssetId,
  phasesUsingAsset,
  withEnsuredPhases,
} from "./phases";
export {
  defaultSpriteGeometry,
  isSilentOrDecorativeSprite,
  isShapeHotspot,
  isSpriteHotspot,
  isTargetHotspot,
  isTextHotspot,
  spriteRect,
} from "./sprites";
export { useHotspotSamModel } from "./sam";
