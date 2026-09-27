export const HEAD_BONE_NAMES = new Set(["mixamorig:Head", "mixamorig:HeadTop_End", "mixamorig:Neck", "Head", "Neck"]);

/** Blender's Armature +90° X. Baking this onto Mixamo Y-up bind verts points the face at -Y. */
export const BLENDER_ARMATURE_X_90: [number, number, number, number] = [0.70710678, 0, 0, 0.70710678];

export function isHeadBoneName(name: string): boolean {
  const trimmed = name.trim();
  if (HEAD_BONE_NAMES.has(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  return lower.endsWith(":head") || lower.endsWith(":headtop_end") || lower === "head" || lower === "neck";
}

/** Sum of skin weights on Head / Neck bones for one vertex. */
export function headBoneWeight(joints: ArrayLike<number>, weights: ArrayLike<number>, headJointIds: Set<number>): number {
  let sum = 0;
  const count = Math.min(joints.length, weights.length);
  for (let index = 0; index < count; index += 1) {
    if (headJointIds.has(joints[index]!)) sum += weights[index]!;
  }
  return sum;
}

export function shouldKeepHeadVertex(weight: number, threshold = 0.4): boolean {
  return weight >= threshold;
}

export function rotateByQuat(
  q: [number, number, number, number],
  x: number,
  y: number,
  z: number,
): [number, number, number] {
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + qy * tz - qz * ty,
    y + qw * ty + qz * tx - qx * tz,
    z + qw * tz + qx * ty - qy * tx,
  ];
}

export function axisExtents(min: number[], max: number[]): [number, number, number] {
  return [
    (max[0] ?? 0) - (min[0] ?? 0),
    (max[1] ?? 0) - (min[1] ?? 0),
    (max[2] ?? 0) - (min[2] ?? 0),
  ];
}

/** Mixamo bind-pose bodies are already Y-up. T-pose arms make X wide, so compare Y to Z. */
export function isStandingBindPose(min: number[], max: number[]): boolean {
  const [, height, depth] = axisExtents(min, max);
  return height > depth * 1.5;
}

export function centerPositions(positions: number[]): void {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]!;
    const y = positions[i + 1]!;
    const z = positions[i + 2]!;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i]! -= cx;
    positions[i + 1]! -= cy;
    positions[i + 2]! -= cz;
  }
}

/**
 * Keep Mixamo bind-pose Y-up / +Z-forward. Only recenter.
 * Applying Armature [0.707,0,0,0.707] maps +Y (crown) to +Z and +Z (face) to -Y.
 */
export function orientExtractedHead(positions: number[]): void {
  centerPositions(positions);
}
