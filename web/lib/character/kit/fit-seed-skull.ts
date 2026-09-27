import { classifyHighlightRegion, isEarVertex } from "./highlight-regions";
import { percentile } from "./fit-skull-filler";
import type { AlbedoClass } from "./extract-hair-from-glb";
import type { HeadProfileRing } from "./kit-types";

/** Keep painted skull skin; drop hair volume and ears (ears are separate meshes). */
export function keepSkullVertex(cls: AlbedoClass, x: number, y: number, z: number): boolean {
  if (isEarVertex(x, y, z)) return false;
  return classifyHighlightRegion(cls, x, y, z) !== "hair";
}

export function collectSkullPositions(positions: number[], classes: AlbedoClass[]): number[] {
  const kept: number[] = [];
  const ys: number[] = [];
  for (let vertex = 0; vertex < classes.length; vertex += 1) {
    const x = positions[vertex * 3]!;
    const y = positions[vertex * 3 + 1]!;
    const z = positions[vertex * 3 + 2]!;
    if (!keepSkullVertex(classes[vertex]!, x, y, z)) continue;
    kept.push(x, y, z);
    ys.push(y);
  }
  if (ys.length === 0) return kept;
  const hairline = percentile(ys, 0.9);
  const trimmed: number[] = [];
  for (let i = 0; i < kept.length; i += 3) {
    if (kept[i + 1]! > hairline + 0.04) continue;
    trimmed.push(kept[i]!, kept[i + 1]!, kept[i + 2]!);
  }
  return trimmed;
}

export function smoothProfileRings(rings: HeadProfileRing[], passes = 2): HeadProfileRing[] {
  let current = rings.map((ring) => ({ ...ring, z: ring.z ?? 0 }));
  for (let pass = 0; pass < passes; pass += 1) {
    current = current.map((ring, index) => {
      if (index === 0 || index >= current.length - 2) return ring;
      const prev = current[index - 1]!;
      const next = current[index + 1]!;
      return {
        y: ring.y,
        rx: (prev.rx + ring.rx * 2 + next.rx) / 4,
        rz: (prev.rz + ring.rz * 2 + next.rz) / 4,
        z: ((prev.z ?? 0) + (ring.z ?? 0) * 2 + (next.z ?? 0)) / 4,
      };
    });
  }
  return current;
}

export function closePoleRings(rings: HeadProfileRing[]): HeadProfileRing[] {
  if (rings.length < 3) return rings;
  const first = rings[0]!;
  const last = rings[rings.length - 1]!;
  const drop = Math.max(0.06, Math.min(0.11, first.rx * 0.2));
  const chin: HeadProfileRing = {
    y: first.y - drop * 0.4,
    rx: Math.max(0.16, first.rx * 0.52),
    rz: Math.max(0.14, first.rz * 0.5),
    z: (first.z ?? 0) * 0.85,
  };
  const prev = rings[rings.length - 2]!;
  const lift = Math.max(0.05, Math.min(0.1, last.rx * 0.18 + 0.05));
  const crown: HeadProfileRing = {
    y: last.y + lift * 0.4,
    rx: Math.max(0.12, last.rx * 0.48),
    rz: Math.max(0.1, last.rz * 0.48),
    z: (last.z ?? 0) * 0.5,
  };
  return [
    { y: first.y - drop, rx: 0.04, rz: 0.04, z: Math.min(0.06, (first.z ?? 0) * 0.35) },
    chin,
    { ...first, rx: Math.max(chin.rx, first.rx * 0.92), rz: Math.max(chin.rz, first.rz * 0.92) },
    ...rings.slice(1, -1),
    { ...last, rx: Math.max(0.14, last.rx * 0.9), rz: Math.max(0.12, last.rz * 0.9) },
    crown,
    { y: last.y + lift, rx: 0.04, rz: 0.04, z: (last.z ?? 0) * 0.3 },
  ];
}

export function collectHairPositions(positions: number[], classes: AlbedoClass[]): number[] {
  const kept: number[] = [];
  for (let vertex = 0; vertex < classes.length; vertex += 1) {
    const x = positions[vertex * 3]!;
    const y = positions[vertex * 3 + 1]!;
    const z = positions[vertex * 3 + 2]!;
    if (isEarVertex(x, y, z)) continue;
    if (classifyHighlightRegion(classes[vertex]!, x, y, z) !== "hair") continue;
    kept.push(x, y, z);
  }
  return kept;
}

const HAIR_INSET = 0.14;

function gatherBand(points: number[], y: number, band: number, pick: (x: number, z: number) => void) {
  for (let i = 0; i < points.length; i += 3) {
    if (Math.abs(points[i + 1]! - y) > band) continue;
    pick(points[i]!, points[i + 2]!);
  }
}

function ringFromGlbBand(skin: number[], hair: number[], y: number, band: number): HeadProfileRing {
  const skinXs: number[] = [];
  const faceZs: number[] = [];
  const hairXs: number[] = [];
  const hairFronts: number[] = [];
  const hairBacks: number[] = [];
  gatherBand(skin, y, band, (x, z) => {
    skinXs.push(Math.abs(x));
    if (z > 0.05) faceZs.push(z);
  });
  gatherBand(hair, y, band, (x, z) => {
    hairXs.push(Math.abs(x));
    if (z > 0) hairFronts.push(z);
    if (z < 0) hairBacks.push(z);
  });
  const rxSkin = skinXs.length ? percentile(skinXs, 0.84) : 0;
  const rxHair = hairXs.length ? Math.max(0.04, percentile(hairXs, 0.72) - HAIR_INSET) : 0;
  const rx = Math.max(0.04, rxSkin, rxHair);
  const frontSkin = faceZs.length ? percentile(faceZs, 0.62) : 0;
  const frontHair = hairFronts.length ? percentile(hairFronts, 0.5) - HAIR_INSET * 0.5 : 0;
  const frontRaw = frontSkin || frontHair || rx * 0.78;
  const front = Math.min(frontRaw, rx * 0.9);
  const hairBack = hairBacks.length ? percentile(hairBacks, 0.18) : -rx;
  const back = Math.max(-rx * 0.92, Math.min(-0.1, hairBack + HAIR_INSET));
  const rz = Math.max(0.08, Math.min(rx * 0.78, (front - back) / 2));
  return {
    y,
    rx,
    rz,
    z: Math.min(0.14, Math.max(-0.06, (front + back) / 2)),
  };
}

/**
 * Closed chin-to-crown skull. Face rings come from painted skin; the
 * occiput and crown follow the hair volume inset so we mimic the GLB
 * head without keeping ripped hair edges.
 */
export function fitClosedSkullProfile(
  skin: number[],
  hair: number[] = [],
  ringCount = 12,
): HeadProfileRing[] {
  const ys: number[] = [];
  for (let i = 1; i < skin.length; i += 3) ys.push(skin[i]!);
  if (ys.length < 12) return [];
  const chin = percentile(ys, 0.06);
  const hairYs: number[] = [];
  for (let i = 1; i < hair.length; i += 3) hairYs.push(hair[i]!);
  const hairTop = hairYs.length ? percentile(hairYs, 0.92) : percentile(ys, 0.9);
  const crownY = hairYs.length ? hairTop - HAIR_INSET * 0.9 : hairTop + Math.max(0.2, percentile(ys, 0.9) - chin) * 0.38;
  const span = Math.max(0.25, crownY - chin);
  const band = span / 10;
  const raw: HeadProfileRing[] = [];
  for (let ring = 0; ring < ringCount; ring += 1) {
    const y = chin + (span * ring) / (ringCount - 1);
    raw.push(ringFromGlbBand(skin, hair, y, band));
  }
  const closed = hair.length > 24 ? closePoleRings(smoothProfileRings(raw)) : closePoleRings(smoothProfileRings(applyRoundCranium(raw, crownY)));
  return smoothProfileRings(closed);
}

/**
 * The painted face is a front shell, so measured rings shrink at the hairline.
 * Rebuild the cranium as a round cap from the widest cheeks so the skull
 * stays an oval dome, not a teardrop.
 */
export function applyRoundCranium(rings: HeadProfileRing[], crownY: number): HeadProfileRing[] {
  if (rings.length < 3) return rings;
  const cheek =
    rings
      .filter((ring) => ring.y >= -0.35 && ring.y <= 0.22)
      .reduce<HeadProfileRing | null>((best, ring) => (!best || ring.rx > best.rx ? ring : best), null) ??
    rings[Math.floor(rings.length / 2)]!;
  const span = Math.max(0.001, (crownY - cheek.y) * 1.18);
  return rings.map((ring) => {
    if (ring.y <= cheek.y + 0.01) return ring;
    const t = Math.min(1, Math.max(0, (ring.y - cheek.y) / span));
    const ease = Math.sqrt(Math.max(0, 1 - t * t));
    return {
      y: ring.y,
      rx: Math.max(0.02, cheek.rx * ease),
      rz: Math.max(0.02, cheek.rz * ease),
      z: (cheek.z ?? 0) * ease,
    };
  });
}

/** Scale so cheek width matches the toy cage the face kit sits on. */
export function normalizeSkullProfile(
  rings: HeadProfileRing[],
  targetCheekRx = 0.78,
  targetHeight = 1.46,
): HeadProfileRing[] {
  if (rings.length === 0) return rings;
  const cheekBand = rings.filter((ring) => ring.y >= -0.22 && ring.y <= 0.22);
  const cheek =
    cheekBand.reduce<HeadProfileRing | null>((best, ring) => (!best || ring.rx > best.rx ? ring : best), null) ??
    rings[Math.floor(rings.length / 2)]!;
  const scaleX = targetCheekRx / Math.max(0.05, cheek.rx);
  const span = Math.max(0.2, rings[rings.length - 1]!.y - rings[0]!.y);
  const scaleY = targetHeight / span;
  const midY = (rings[0]!.y + rings[rings.length - 1]!.y) / 2;
  return rings.map((ring) => ({
    y: (ring.y - midY) * scaleY,
    rx: Math.max(0.02, ring.rx * scaleX),
    rz: Math.max(0.02, ring.rz * scaleX),
    z: (ring.z ?? 0) * scaleX,
  }));
}

export function profileToJson(rings: HeadProfileRing[]): string {
  const body = rings
    .map((ring) => {
      const z = ring.z ?? 0;
      return `    { y: ${ring.y.toFixed(2)}, rx: ${ring.rx.toFixed(2)}, rz: ${ring.rz.toFixed(2)}, z: ${z.toFixed(2)} }`;
    })
    .join(",\n");
  return `[\n${body},\n]`;
}
