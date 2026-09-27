import { Vector3 } from "three";
import { GLOBE_RADIUS } from "./globe-config";
import { planetSurfaceHeight } from "./planet-terrain";
import { latLonToNormal, wrapAuthoredOffset } from "./sphere-wrap";
import type { WorldLandmass } from "./world-landmasses";

export function placeOnLandmass(
  landmass: WorldLandmass,
  localX: number,
  localZ: number,
  extraLift = 0.002,
): { lat: number; lon: number; radius: number; normal: Vector3 } {
  const wrapped = wrapAuthoredOffset(
    landmass.lat,
    landmass.lon,
    localX,
    localZ,
    landmass.yaw,
    landmass.unitsToRadians,
  );
  return {
    lat: wrapped.lat,
    lon: wrapped.lon,
    radius: GLOBE_RADIUS + planetSurfaceHeight(wrapped.lat, wrapped.lon) + extraLift,
    normal: wrapped.normal,
  };
}

export function pointAlongNormal(lat: number, lon: number, radius: number): Vector3 {
  return latLonToNormal(lat, lon).multiplyScalar(radius);
}
