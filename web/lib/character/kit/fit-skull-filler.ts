import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import type { HeadProfileRing } from "./kit-types";

export type CloudScan = {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  centroid: [number, number, number];
  rings: HeadProfileRing[];
};

function emptyBounds(): { min: [number, number, number]; max: [number, number, number] } {
  return {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  };
}

/** Percentile of a sorted-copy of values. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index]!;
}

/**
 * Latitude rings from a vertex cloud. Used to compare the cut face, the
 * original fused head, and the toy skull.
 */
export function scanPointCloud(positions: number[], ringCount = 9): CloudScan {
  const box = emptyBounds();
  const ys: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!;
    const y = positions[i + 1]!;
    const z = positions[i + 2]!;
    box.min[0] = Math.min(box.min[0], x);
    box.min[1] = Math.min(box.min[1], y);
    box.min[2] = Math.min(box.min[2], z);
    box.max[0] = Math.max(box.max[0], x);
    box.max[1] = Math.max(box.max[1], y);
    box.max[2] = Math.max(box.max[2], z);
    ys.push(y);
  }
  const size: [number, number, number] = [
    box.max[0] - box.min[0],
    box.max[1] - box.min[1],
    box.max[2] - box.min[2],
  ];
  const centroid: [number, number, number] = [
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
    (box.min[2] + box.max[2]) / 2,
  ];
  if (ys.length === 0) {
    return { min: box.min, max: box.max, size, centroid, rings: [] };
  }
  const y0 = percentile(ys, 0.02);
  const y1 = percentile(ys, 0.98);
  const span = Math.max(0.001, y1 - y0);
  const rings: HeadProfileRing[] = [];
  for (let ring = 0; ring < ringCount; ring += 1) {
    const y = y0 + (span * ring) / (ringCount - 1);
    const band = span / (ringCount * 1.2);
    let maxRx = 0.01;
    let maxRz = 0.01;
    let zSum = 0;
    let count = 0;
    for (let i = 0; i < positions.length; i += 3) {
      const py = positions[i + 1]!;
      if (Math.abs(py - y) > band) continue;
      const x = positions[i]!;
      const z = positions[i + 2]!;
      maxRx = Math.max(maxRx, Math.abs(x));
      maxRz = Math.max(maxRz, Math.abs(z));
      zSum += z;
      count += 1;
    }
    rings.push({ y, rx: maxRx, rz: maxRz, z: count ? zSum / count : 0 });
  }
  return { min: box.min, max: box.max, size, centroid, rings };
}

export function toyProfileSpan(rings: HeadProfileRing[] = DEFAULT_HEAD_PROFILE): {
  minY: number;
  maxY: number;
  maxRx: number;
} {
  return {
    minY: rings[0]?.y ?? -0.7,
    maxY: rings[rings.length - 1]?.y ?? 0.76,
    maxRx: rings.reduce((high, ring) => Math.max(high, ring.rx, ring.rz), 0),
  };
}

export type FittedSkull = {
  rings: HeadProfileRing[];
  /** Front-of-skull window: hide lathe tris below this Y and in front of the face. */
  joinY: number;
};

/**
 * Fit the toy skull to the cut face's cheeks. Height follows toy proportions
 * from the face chin, clamped so the crown stays under the original hair puff.
 * Inset so the filler sits inside the painted face shell.
 */
export function fitSkullProfile(
  face: CloudScan,
  original: CloudScan,
  toy: HeadProfileRing[] = DEFAULT_HEAD_PROFILE,
  hairlineY?: number,
): FittedSkull {
  const toySpan = toyProfileSpan(toy);
  const toyHeight = toySpan.maxY - toySpan.minY;
  const cheek =
    face.rings.find((ring) => ring.y >= -0.15 && ring.y <= 0.2) ?? face.rings[Math.floor(face.rings.length / 2)];
  const cheekRx = Math.max(0.05, cheek?.rx ?? face.size[0] / 2);
  const widthScale = (cheekRx / Math.max(0.05, toySpan.maxRx)) * 0.9;
  const chinY = face.min[1];
  const toyCrown = chinY + toyHeight * (cheekRx / Math.max(0.05, toySpan.maxRx));
  const crownY = Math.min(toyCrown, original.max[1] - 0.1);
  const heightScale = Math.max(0.2, (crownY - chinY) / toyHeight);
  const mappedHairline = chinY + (0.26 - toySpan.minY) * heightScale;
  const joinY = Math.min(
    crownY - 0.08,
    Math.max(chinY + 0.2, hairlineY ?? Math.min(face.max[1] - 0.03, mappedHairline)),
  );
  return {
    joinY,
    rings: toy.map((ring) => ({
      y: chinY + (ring.y - toySpan.minY) * heightScale,
      rx: ring.rx * widthScale,
      rz: ring.rz * widthScale * 0.98,
      z: (ring.z ?? 0) * widthScale,
    })),
  };
}

export function skullFillerCoversCrown(face: CloudScan, fitted: HeadProfileRing[]): boolean {
  const crown = fitted[fitted.length - 1];
  return Boolean(crown && crown.y > face.max[1] + 0.02);
}

export function clipLatheFrontBelowY(
  positions: number[],
  indices: number[],
  joinY: number,
  zCut = 0.02,
): number[] {
  const kept: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const ay = positions[indices[i]! * 3 + 1]!;
    const by = positions[indices[i + 1]! * 3 + 1]!;
    const cy = positions[indices[i + 2]! * 3 + 1]!;
    const az = positions[indices[i]! * 3 + 2]!;
    const bz = positions[indices[i + 1]! * 3 + 2]!;
    const cz = positions[indices[i + 2]! * 3 + 2]!;
    const y = (ay + by + cy) / 3;
    const z = (az + bz + cz) / 3;
    if (y < joinY && z > zCut) continue;
    kept.push(indices[i]!, indices[i + 1]!, indices[i + 2]!);
  }
  return kept;
}

export function buildSkullFillerMesh(
  rings: HeadProfileRing[],
  capUv: [number, number],
  segments = 32,
  clip?: { joinY: number; zCut?: number },
): { positions: number[]; normals: number[]; uvs: number[]; indices: number[] } {
  const positions: number[] = [];
  const uvs: number[] = [];
  for (const ring of rings) {
    for (let spoke = 0; spoke < segments; spoke += 1) {
      const angle = (spoke / segments) * Math.PI * 2;
      const x = ring.rx * Math.cos(angle);
      const y = ring.y;
      const z = (ring.z ?? 0) + ring.rz * Math.sin(angle);
      positions.push(x, y, z);
      uvs.push(capUv[0], capUv[1]);
    }
  }
  const indices: number[] = [];
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let spoke = 0; spoke < segments; spoke += 1) {
      const a = ring * segments + spoke;
      const b = ring * segments + ((spoke + 1) % segments);
      const c = (ring + 1) * segments + spoke;
      const d = (ring + 1) * segments + ((spoke + 1) % segments);
      indices.push(a, c, b, b, c, d);
    }
  }
  const cy = rings.reduce((sum, ring) => sum + ring.y, 0) / Math.max(1, rings.length);
  const normals: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!;
    const y = positions[i + 1]! - cy;
    const z = positions[i + 2]!;
    const length = Math.hypot(x, y, z) || 1;
    normals.push(x / length, y / length, z / length);
  }
  const clipped = clip ? clipLatheFrontBelowY(positions, indices, clip.joinY, clip.zCut) : indices;
  return { positions, normals, uvs, indices: clipped };
}

/** Drop shredded crown tris from the cut face so the filler can own the scalp. */
export function dropTrianglesAboveY(
  positions: number[],
  indices: number[],
  yCut: number,
): number[] {
  const kept: number[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    const ay = positions[indices[i]! * 3 + 1]!;
    const by = positions[indices[i + 1]! * 3 + 1]!;
    const cy = positions[indices[i + 2]! * 3 + 1]!;
    if ((ay + by + cy) / 3 > yCut) continue;
    kept.push(indices[i]!, indices[i + 1]!, indices[i + 2]!);
  }
  return kept;
}
