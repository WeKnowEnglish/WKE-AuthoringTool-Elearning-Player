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
  downloadExploreHotspotsJson,
  getStudioExploreHotspots,
  listStudioExploreHotspots,
  saveExploreHotspotsToStudio,
  validateExploreHotspotsDocument,
  type StudioExploreHotspotsRef,
} from "./studio";
export { HOBBIES_HOTSPOT_ACTIVITY } from "./fixtures/hobbiesHotspot";
export {
  ensurePhases,
  hotspotsForPhase,
  nextPhaseId,
  withEnsuredPhases,
} from "./phases";
export { useHotspotSamModel } from "./sam";
