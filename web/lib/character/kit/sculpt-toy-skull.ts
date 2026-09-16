import type { BufferGeometry } from "three";
import type { Vec3 } from "@/lib/character/character-types";

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function dist3(x: number, y: number, z: number, target: Vec3): number {
  const dx = x - target[0];
  const dy = y - target[1];
  const dz = z - target[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export type ToySkullSculpt = {
  leftEye: Vec3;
  rightEye: Vec3;
  eyeRadius: number;
};

/**
 * After the lathe: tuck side cheeks so they do not balloon past the GLB
 * face, drop a chin pad into the ghost jaw, and bowl sockets for the globes.
 */
export function sculptToySkull(geometry: BufferGeometry, sculpt: ToySkullSculpt): BufferGeometry {
  const positions = geometry.getAttribute("position");
  if (!positions) return geometry;
  const socketRadius = sculpt.eyeRadius * 1.62;
  const socketDepth = sculpt.eyeRadius * 0.58;
  const chin: Vec3 = [0, -0.74, 0.32];

  for (let index = 0; index < positions.count; index += 1) {
    let x = positions.getX(index);
    let y = positions.getY(index);
    let z = positions.getZ(index);

    if (z > 0.1 && y > -0.48 && y < 0.16) {
      const along = smoothstep(1 - Math.abs(y + 0.1) / 0.4);
      const side = smoothstep((Math.abs(x) - 0.22) / 0.4) * smoothstep((0.74 - Math.abs(x)) / 0.2);
      const front = smoothstep((z - 0.1) / 0.28);
      x -= Math.sign(x || 1) * along * side * front * 0.04;
    }

    const chinDist = dist3(x, y, z, chin);
    if (chinDist < 0.22) {
      const weight = smoothstep(1 - chinDist / 0.22);
      z += weight * 0.055;
      y -= weight * 0.025;
    }

    for (const eye of [sculpt.leftEye, sculpt.rightEye]) {
      const d = dist3(x, y, z, eye);
      if (d >= socketRadius || z < 0.08) continue;
      const weight = smoothstep(1 - d / socketRadius);
      z -= weight * socketDepth;
      x += (eye[0] - x) * weight * 0.14;
      y += (eye[1] - y) * weight * 0.08;
    }

    positions.setXYZ(index, x, y, z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function nearestVertexZ(geometry: BufferGeometry, x: number, y: number): number {
  const positions = geometry.getAttribute("position");
  let bestZ = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < positions.count; index += 1) {
    const z = positions.getZ(index);
    if (z <= 0.05) continue;
    const dx = positions.getX(index) - x;
    const dy = positions.getY(index) - y;
    const d = dx * dx + dy * dy;
    if (d >= best) continue;
    best = d;
    bestZ = z;
  }
  return bestZ;
}
