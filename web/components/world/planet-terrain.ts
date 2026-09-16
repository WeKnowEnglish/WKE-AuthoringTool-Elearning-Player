/**
 * Starter globe: a grass planet with a few clay cliffs.
 * Campus stays a low meadow so house / school / pet sit on the surface.
 */

export const GRASS = [0.34, 0.72, 0.28] as const;
export const MEADOW = [0.22, 0.58, 0.22] as const;
export const HILL = [0.16, 0.46, 0.18] as const;
export const ROCK = [0.42, 0.36, 0.32] as const;
export const CLIFF = [0.55, 0.48, 0.42] as const;

export const HOME_GLOBE_LAT = -2;
export const HOME_GLOBE_LON = 0;

/** Angular radius (degrees) of the flat campus meadow. */
export const CAMPUS_CLEARING = 22;

function lonDelta(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a: readonly [number, number, number], b: readonly [number, number, number], t: number): [number, number, number] {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function angularDistance(lat: number, lon: number, lat0: number, lon0: number): number {
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (lat0 * Math.PI) / 180;
  const dLon = (lonDelta(lon, lon0) * Math.PI) / 180;
  const dLat = lat1 - lat2;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(a))) * 180) / Math.PI;
}

/** 1 on the campus meadow, 0 far away. */
export function campusMask(lat: number, lon: number): number {
  return smoothstep(CAMPUS_CLEARING + 10, CAMPUS_CLEARING - 4, angularDistance(lat, lon, HOME_GLOBE_LAT, HOME_GLOBE_LON));
}

function mesa(lat: number, lon: number, lat0: number, lon0: number, rLat: number, rLon: number, peak: number): number {
  const u = (lat - lat0) / rLat;
  const v = lonDelta(lon, lon0) / rLon;
  const d = Math.hypot(u, v);
  if (d >= 1) return 0;
  const t = 1 - d;
  const plateau = t > 0.42 ? 1 : (t / 0.42) ** 1.55;
  return peak * plateau;
}

export function planetCliffHeight(lat: number, lon: number): number {
  const away = 1 - campusMask(lat, lon);
  if (away <= 0.02) return 0;
  let height = 0;
  height += mesa(lat, lon, 34, 108, 14, 36, 0.09);
  height += mesa(lat, lon, -46, -98, 11, 28, 0.075);
  height += mesa(lat, lon, 12, -158, 9, 40, 0.08);
  height += mesa(lat, lon, -28, 72, 8, 18, 0.055);
  height += mesa(lat, lon, 52, -24, 12, 22, 0.062);
  return height * away;
}

function grassNoise(lat: number, lon: number): number {
  return (
    0.45 +
    0.28 * Math.sin(lat * 0.11 + lon * 0.07) * Math.sin(lon * 0.09 - lat * 0.05) +
    0.16 * Math.sin(lat * 0.23 + lon * 0.19)
  );
}

export function planetSurfaceHeight(lat: number, lon: number): number {
  const campus = campusMask(lat, lon);
  const meadow = 0.01 + 0.006 * grassNoise(lat, lon) * (1 - campus * 0.7);
  return meadow + planetCliffHeight(lat, lon);
}

export function planetSlope(lat: number, lon: number): number {
  const step = 0.7;
  const here = planetSurfaceHeight(lat, lon);
  const dLat = planetSurfaceHeight(lat + step, lon) - here;
  const dLon = planetSurfaceHeight(lat, lon + step) - here;
  return Math.hypot(dLat, dLon) / step;
}

export function planetColor(lat: number, lon: number): [number, number, number] {
  const cliff = planetCliffHeight(lat, lon);
  const slope = planetSlope(lat, lon);
  if (slope > 0.045 || cliff > 0.034) {
    return mix(ROCK, CLIFF, Math.min(1, slope * 14 + cliff * 6));
  }
  const n = grassNoise(lat, lon);
  const grass = mix(GRASS, MEADOW, smoothstep(0.28, 0.72, n));
  if (cliff > 0.012) return mix(grass, HILL, smoothstep(0.012, 0.034, cliff));
  return mix(grass, HILL, smoothstep(0.012, 0.02, planetSurfaceHeight(lat, lon)) * 0.35);
}
