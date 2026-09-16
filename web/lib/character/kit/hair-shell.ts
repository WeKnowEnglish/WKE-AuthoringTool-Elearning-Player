import type { Vec3 } from "@/lib/character/character-types";
import { interpolateProfileRing, parseProfileRings } from "./head-profile";
import type { HeadProfileRing, KitHair, KitHairTuft } from "./kit-types";

/**
 * Rest silhouette for the reference kid hair. z / inflate are applied at
 * build time from hairlineY, overshoot, and backBias.
 */
export const REFERENCE_KID_HAIR_SHELL: HeadProfileRing[] = [
  { y: 0.02, rx: 0.82, rz: 0.48, z: 0 },
  { y: 0.18, rx: 0.8, rz: 0.58, z: 0 },
  { y: 0.36, rx: 0.7, rz: 0.66, z: 0 },
  { y: 0.52, rx: 0.54, rz: 0.58, z: 0 },
  { y: 0.66, rx: 0.32, rz: 0.36, z: 0 },
  { y: 0.78, rx: 0.08, rz: 0.08, z: 0 },
];

export function cloneHair(hair: KitHair): KitHair {
  return {
    hairlineY: hair.hairlineY,
    overshoot: hair.overshoot,
    backBias: hair.backBias,
    shell: hair.shell?.map((ring) => ({ ...ring })),
    tufts: hair.tufts.map((tuft) => cloneTuft(tuft)),
  };
}

export function cloneTuft(tuft: KitHairTuft): KitHairTuft {
  return {
    ...tuft,
    position: [...tuft.position] as Vec3,
    tilt: [...tuft.tilt] as Vec3,
  };
}

export function sliceProfileFromHairline(rings: HeadProfileRing[], hairlineY: number): HeadProfileRing[] {
  const sorted = [...rings].sort((left, right) => left.y - right.y);
  const hairline = interpolateProfileRing(sorted, hairlineY);
  const above = sorted.filter((ring) => ring.y > hairlineY + 0.01);
  const sliced = [hairline, ...above];
  while (sliced.length < 3) {
    const top = sliced[sliced.length - 1] ?? hairline;
    const midY = (hairline.y + top.y) / 2 + sliced.length * 0.04;
    sliced.splice(sliced.length - 1, 0, interpolateProfileRing(sorted, Math.min(top.y - 0.01, midY)));
  }
  return sliced.sort((left, right) => left.y - right.y);
}

export function applyHairFit(rings: HeadProfileRing[], overshoot: number, backBias: number): HeadProfileRing[] {
  const inflate = 1 + overshoot;
  const yMin = rings[0]?.y ?? 0;
  const yMax = rings[rings.length - 1]?.y ?? yMin + 0.01;
  const span = Math.max(0.01, yMax - yMin);
  return rings.map((ring) => {
    const t = 1 - (ring.y - yMin) / span;
    return {
      y: ring.y,
      rx: Math.max(0.01, ring.rx * inflate),
      rz: Math.max(0.01, ring.rz * inflate),
      z: (ring.z ?? 0) + backBias * t,
    };
  });
}

export function deriveHairShell(
  skull: HeadProfileRing[],
  hairlineY: number,
  overshoot: number,
  backBias: number,
): HeadProfileRing[] {
  return applyHairFit(sliceProfileFromHairline(skull, hairlineY), overshoot, backBias);
}

/** Shell rings the mesh builder should emit. Authored shell wins; otherwise derive from the skull. */
export function resolveHairShell(hair: KitHair, skull: HeadProfileRing[]): HeadProfileRing[] {
  const source = parseProfileRings(hair.shell) ?? skull;
  return applyHairFit(sliceProfileFromHairline(source, hair.hairlineY), hair.overshoot, hair.backBias);
}
