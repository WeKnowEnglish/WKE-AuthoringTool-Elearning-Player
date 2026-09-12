import { Vector3 } from "three";

export function latLonToNormal(latDeg: number, lonDeg: number): Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return new Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
}

function sphereTangentBasis(latDeg: number, lonDeg: number): { east: Vector3; north: Vector3 } {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    east: new Vector3(Math.cos(lon), 0, -Math.sin(lon)),
    north: new Vector3(-Math.sin(lat) * Math.sin(lon), Math.cos(lat), -Math.sin(lat) * Math.cos(lon)),
  };
}

/**
 * Map a flat Studio XZ offset onto the globe. The point is pushed along the
 * tangent plane, then projected back onto the unit sphere so land follows
 * the ocean's curvature.
 */
export function wrapAuthoredOffset(
  originLat: number,
  originLon: number,
  localX: number,
  localZ: number,
  yaw: number,
  unitsToRadians: number,
): { lat: number; lon: number; normal: Vector3 } {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const x = localX * cos - localZ * sin;
  const z = localX * sin + localZ * cos;

  const origin = latLonToNormal(originLat, originLon);
  const { east, north } = sphereTangentBasis(originLat, originLon);
  const normal = origin
    .add(east.multiplyScalar(x * unitsToRadians))
    .add(north.multiplyScalar(-z * unitsToRadians))
    .normalize();

  return {
    lat: (Math.asin(normal.y) * 180) / Math.PI,
    lon: (Math.atan2(normal.x, normal.z) * 180) / Math.PI,
    normal,
  };
}

export function authoredAngularRadius(partWidth: number, unitsToRadians: number): number {
  return Math.max(0.04, partWidth * unitsToRadians);
}

export function authoredShellRadius(globeRadius: number, authoredHeight: number): number {
  return globeRadius + 0.008 + authoredHeight * 0.085;
}
