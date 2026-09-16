import type { HeadProfileRing, HeadRegions } from "./kit-types";

/**
 * Seed skull without hair, then retargeted to the GLB face: longer chin,
 * slimmer cheeks (hair volume is not cheek fat), round crown kept.
 */
export const DEFAULT_HEAD_PROFILE: HeadProfileRing[] = [
  { y: -0.82, rx: 0.07, rz: 0.07, z: 0.12 },
  { y: -0.72, rx: 0.44, rz: 0.34, z: 0.16 },
  { y: -0.62, rx: 0.6, rz: 0.44, z: 0.12 },
  { y: -0.5, rx: 0.66, rz: 0.5, z: 0.08 },
  { y: -0.39, rx: 0.68, rz: 0.52, z: 0.04 },
  { y: -0.28, rx: 0.69, rz: 0.52, z: 0.02 },
  { y: -0.17, rx: 0.7, rz: 0.52, z: 0 },
  { y: -0.05, rx: 0.7, rz: 0.53, z: 0 },
  { y: 0.06, rx: 0.69, rz: 0.52, z: -0.01 },
  { y: 0.17, rx: 0.68, rz: 0.51, z: -0.01 },
  { y: 0.28, rx: 0.66, rz: 0.5, z: -0.01 },
  { y: 0.4, rx: 0.62, rz: 0.48, z: -0.01 },
  { y: 0.51, rx: 0.54, rz: 0.42, z: -0.01 },
  { y: 0.62, rx: 0.4, rz: 0.32, z: 0 },
  { y: 0.66, rx: 0.22, rz: 0.18, z: 0 },
  { y: 0.73, rx: 0.06, rz: 0.06, z: 0 },
];

const LEGACY_TOY_RING_COUNT = 9;
const LEGACY_SQUAT_RING_COUNT = 16;

/** Saved kits still carrying the 9-ring toy egg or the squat apple skull. */
export function isLegacyToyProfile(rings: HeadProfileRing[] | null): boolean {
  if (!rings) return false;
  if (rings.length === LEGACY_TOY_RING_COUNT) {
    const chin = rings[0]!;
    const cheek = rings[4]!;
    return chin.y === -0.7 && chin.rx === 0.2 && cheek.rx === 0.78 && cheek.y === 0.04;
  }
  if (rings.length === LEGACY_SQUAT_RING_COUNT) {
    const chin = rings[0]!;
    const cheek = rings[7]!;
    if (chin.y === -0.63 && chin.rx === 0.06 && cheek.rx === 0.78 && cheek.y === -0.05) return true;
    return chin.y === -0.73 && chin.rx === 0.06 && cheek.rx === 0.78;
  }
  if (rings.length === 13) {
    const chin = rings[0]!;
    const cranium = rings[6]!;
    const cheek = rings[5]!;
    if (chin.y === -0.72 && chin.rx === 0.05 && cranium.rx === 0.8 && cranium.y === 0.12) return true;
    if (chin.y === -0.76 && chin.rx === 0.05 && cheek.rx === 0.8 && cheek.y === -0.18) return true;
    if (chin.y === -0.78 && chin.rx === 0.07 && cheek.rx === 0.82 && cheek.y === -0.12) return true;
    return chin.y === -0.76 && chin.rx === 0.07 && cheek.rx === 0.82 && rings[11]!.rx === 0.26;
  }
  if (rings.length === 14) {
    const chin = rings[0]!;
    const cheek = rings[5]!;
    if (chin.y !== -0.76 || chin.rx !== 0.07) return false;
    return cheek.rx === 0.82 || cheek.rx === 0.74;
  }
  return false;
}

export function parseProfileRings(raw: unknown): HeadProfileRing[] | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const rings = raw
    .map((item): HeadProfileRing | null => {
      const ring = item && typeof item === "object" ? (item as Partial<HeadProfileRing>) : {};
      const y = typeof ring.y === "number" && Number.isFinite(ring.y) ? ring.y : null;
      const rx = typeof ring.rx === "number" && Number.isFinite(ring.rx) ? ring.rx : null;
      const rz = typeof ring.rz === "number" && Number.isFinite(ring.rz) ? ring.rz : rx;
      if (y === null || rx === null || rz === null) return null;
      const z = typeof ring.z === "number" && Number.isFinite(ring.z) ? ring.z : 0;
      return {
        y: Math.min(1.4, Math.max(-1.2, y)),
        rx: Math.min(1.4, Math.max(0.01, rx)),
        rz: Math.min(1.4, Math.max(0.01, rz)),
        z: Math.min(0.6, Math.max(-0.6, z)),
      };
    })
    .filter((ring): ring is HeadProfileRing => ring !== null)
    .sort((left, right) => left.y - right.y);
  return rings.length >= 3 ? rings : null;
}

export function interpolateProfileRing(rings: HeadProfileRing[], y: number): HeadProfileRing {
  if (rings.length === 0) return { y, rx: 0.2, rz: 0.2, z: 0 };
  if (y <= rings[0]!.y) return { ...rings[0]!, y, z: rings[0]!.z ?? 0 };
  const last = rings[rings.length - 1]!;
  if (y >= last.y) return { ...last, y, z: last.z ?? 0 };
  for (let index = 0; index < rings.length - 1; index += 1) {
    const a = rings[index]!;
    const b = rings[index + 1]!;
    if (y < a.y || y > b.y) continue;
    const t = (y - a.y) / Math.max(0.0001, b.y - a.y);
    return {
      y,
      rx: a.rx + (b.rx - a.rx) * t,
      rz: a.rz + (b.rz - a.rz) * t,
      z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
    };
  }
  return { ...rings[0]!, y, z: rings[0]!.z ?? 0 };
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function interpolateProfileRingSmooth(rings: HeadProfileRing[], y: number): HeadProfileRing {
  if (rings.length < 3) return interpolateProfileRing(rings, y);
  if (y <= rings[0]!.y) return { ...rings[0]!, y, z: rings[0]!.z ?? 0 };
  const last = rings[rings.length - 1]!;
  if (y >= last.y) return { ...last, y, z: last.z ?? 0 };
  let index = 0;
  while (index < rings.length - 2 && y > rings[index + 1]!.y) index += 1;
  const r0 = rings[Math.max(0, index - 1)]!;
  const r1 = rings[index]!;
  const r2 = rings[index + 1]!;
  const r3 = rings[Math.min(rings.length - 1, index + 2)]!;
  const t = (y - r1.y) / Math.max(0.0001, r2.y - r1.y);
  return {
    y,
    rx: Math.min(1.4, Math.max(0.01, catmull(r0.rx, r1.rx, r2.rx, r3.rx, t))),
    rz: Math.min(1.4, Math.max(0.01, catmull(r0.rz, r1.rz, r2.rz, r3.rz, t))),
    z: Math.min(0.6, Math.max(-0.6, catmull(r0.z ?? 0, r1.z ?? 0, r2.z ?? 0, r3.z ?? 0, t))),
  };
}

/** Subdivide the authored cage so the lathe can match Mixamo-level density. */
export function densifyProfileRings(rings: HeadProfileRing[], count: number): HeadProfileRing[] {
  if (rings.length < 2 || count <= rings.length) return rings.map((ring) => ({ ...ring, z: ring.z ?? 0 }));
  const first = rings[0]!;
  const last = rings[rings.length - 1]!;
  const span = last.y - first.y;
  const out: HeadProfileRing[] = [];
  for (let step = 0; step < count; step += 1) {
    const y = first.y + (span * step) / (count - 1);
    out.push(interpolateProfileRingSmooth(rings, y));
  }
  return out;
}

export function normalizeHeadProfile(raw: unknown): HeadProfileRing[] {
  return parseProfileRings(raw) ?? DEFAULT_HEAD_PROFILE.map((ring) => ({ ...ring }));
}

export function applyProfileRegions(rings: HeadProfileRing[], regions: HeadRegions): HeadProfileRing[] {
  return rings.map((ring) => {
    let { y, rx, rz } = ring;
    if (y < -0.3) {
      const chin = 0.55 + 0.45 * regions.chin;
      rx *= chin;
      rz *= chin;
      y -= (regions.chin - 1) * 0.04;
    } else if (y < 0.28) {
      rx *= 0.55 + 0.45 * regions.cheeks;
    } else {
      const crown = 0.7 + 0.3 * regions.crown;
      rx *= crown;
      rz *= crown;
      y += (regions.crown - 1) * 0.06;
    }
    return { y, rx: Math.max(0.01, rx), rz: Math.max(0.01, rz), z: ring.z ?? 0 };
  });
}
