import { GLOBE_RADIUS } from "@/components/world/globe-config";
import { placeOnLandmass } from "@/components/world/place-on-land";
import { latLonToNormal } from "@/components/world/sphere-wrap";
import { HOME_LOCALS, landmassById, type HomeSpotId } from "@/components/world/world-landmasses";
import { planetSurfaceHeight } from "@/components/world/planet-terrain";

export const GLOBE_WALK_SPEED = 0.2;
export const GLOBE_ENTER_RADIANS = 0.18;
export const GLOBE_KID_SCALE = 0.2;

export type GlobePose = {
  lat: number;
  lon: number;
  facing: number;
};

function lonDelta(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

export function globeAngularDistance(lat: number, lon: number, lat0: number, lon0: number): number {
  const lat1 = (lat * Math.PI) / 180;
  const lat2 = (lat0 * Math.PI) / 180;
  const dLon = (lonDelta(lon, lon0) * Math.PI) / 180;
  const dLat = lat1 - lat2;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function stepOnGlobe(lat: number, lon: number, east: number, north: number, radians: number): { lat: number; lon: number } {
  const length = Math.hypot(east, north);
  if (length < 0.08 || radians === 0) return { lat, lon };
  const nx = east / length;
  const nz = north / length;
  const origin = latLonToNormal(lat, lon);
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const eastAxis = { x: Math.cos(lonR), y: 0, z: -Math.sin(lonR) };
  const northAxis = {
    x: -Math.sin(latR) * Math.sin(lonR),
    y: Math.cos(latR),
    z: -Math.sin(latR) * Math.cos(lonR),
  };
  const next = {
    x: origin.x + (eastAxis.x * nx + northAxis.x * nz) * radians,
    y: origin.y + (eastAxis.y * nx + northAxis.y * nz) * radians,
    z: origin.z + (eastAxis.z * nx + northAxis.z * nz) * radians,
  };
  const mag = Math.hypot(next.x, next.y, next.z) || 1;
  return {
    lat: (Math.asin(Math.min(1, Math.max(-1, next.y / mag))) * 180) / Math.PI,
    lon: (Math.atan2(next.x, next.z) * 180) / Math.PI,
  };
}

export function globeSurfaceRadius(lat: number, lon: number): number {
  return GLOBE_RADIUS + planetSurfaceHeight(lat, lon) + 0.002;
}

export function homeSpotPose(spot: HomeSpotId): { lat: number; lon: number; radius: number } {
  const landmass = landmassById("home")!;
  const local = HOME_LOCALS[spot];
  return placeOnLandmass(landmass, local.localX, local.localZ);
}

/** Stand a little toward campus center so the building is ahead. */
export function approachSpotLocal(spot: HomeSpotId): { localX: number; localZ: number } {
  const local = HOME_LOCALS[spot];
  const length = Math.hypot(local.localX, local.localZ) || 1;
  const pull = 0.22;
  return {
    localX: local.localX - (local.localX / length) * pull,
    localZ: local.localZ - (local.localZ / length) * pull,
  };
}

export function spawnOnGlobe(spot?: HomeSpotId | null): GlobePose {
  const landmass = landmassById("home")!;
  if (!spot) {
    const pose = placeOnLandmass(landmass, 0.04, 0.08);
    return { lat: pose.lat, lon: pose.lon, facing: 0 };
  }
  const local = approachSpotLocal(spot);
  const pose = placeOnLandmass(landmass, local.localX, local.localZ);
  return { lat: pose.lat, lon: pose.lon, facing: 0 };
}

export function nearestHomeSpot(lat: number, lon: number, maxRadians = GLOBE_ENTER_RADIANS): HomeSpotId | null {
  let best: HomeSpotId | null = null;
  let bestDistance = maxRadians;
  for (const spot of ["cottage", "school", "pet"] as const) {
    const pose = homeSpotPose(spot);
    const distance = globeAngularDistance(lat, lon, pose.lat, pose.lon);
    if (distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}

export function enterHref(spot: HomeSpotId, surface: "student" | "pilot" = "student"): string {
  if (spot === "pet") return "/primary?nav=games";
  const root = surface === "pilot" ? "/pilots/world/play" : "/primary/world/play";
  return `${root}/${spot}?inside=1`;
}

export function enterLabel(spot: HomeSpotId): string {
  if (spot === "pet") return "Play with your pet";
  return "Go inside";
}
