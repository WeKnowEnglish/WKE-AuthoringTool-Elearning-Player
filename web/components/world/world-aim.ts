import { areaCameraDistance, focusCameraDistance } from "./globe-config";
import { placeOnLandmass } from "./place-on-land";
import { homeLocalsFromPlacements, type WorldPlacement } from "./world-placements";
import { HOME_LOCALS, landmassById, type WorldSelection } from "./world-landmasses";

export function aimForSelection(selection: WorldSelection, placements?: WorldPlacement[]): { lat: number; lon: number } {
  const landmass = landmassById(selection.landmassId);
  if (!landmass) return { lat: 0, lon: 0 };

  if (landmass.zone === "home" && selection.spot) {
    const locals = placements ? homeLocalsFromPlacements(placements) : HOME_LOCALS;
    const local = locals[selection.spot];
    const pose = placeOnLandmass(landmass, local.localX, local.localZ);
    return { lat: pose.lat, lon: pose.lon };
  }

  if (selection.lookLat != null && selection.lookLon != null) {
    return { lat: selection.lookLat, lon: selection.lookLon };
  }

  const pose = placeOnLandmass(landmass, landmass.focusX ?? 0, landmass.focusZ ?? 0);
  return { lat: pose.lat, lon: pose.lon };
}

export function areaDistanceForSelection(selection: WorldSelection, viewportWidth: number, arriving: boolean): number {
  if (!arriving && (selection.spot || selection.lookLat != null)) {
    return areaCameraDistance(viewportWidth);
  }
  return focusCameraDistance(viewportWidth);
}
