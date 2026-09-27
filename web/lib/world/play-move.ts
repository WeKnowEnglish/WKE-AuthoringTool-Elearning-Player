export type Aabb = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function aabbFromCenter(x: number, z: number, width: number, depth: number, pad = 0): Aabb {
  return {
    minX: x - width / 2 - pad,
    maxX: x + width / 2 + pad,
    minZ: z - depth / 2 - pad,
    maxZ: z + depth / 2 + pad,
  };
}

export function circleHitsAabb(x: number, z: number, radius: number, wall: Aabb): boolean {
  const nearestX = Math.min(wall.maxX, Math.max(wall.minX, x));
  const nearestZ = Math.min(wall.maxZ, Math.max(wall.minZ, z));
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

export function moveWithWalls(
  x: number,
  z: number,
  vx: number,
  vz: number,
  radius: number,
  walls: Aabb[],
  clampRadius?: number,
): { x: number; z: number } {
  const nextX = x + vx;
  if (!walls.some((wall) => circleHitsAabb(nextX, z, radius, wall))) x = nextX;
  const nextZ = z + vz;
  if (!walls.some((wall) => circleHitsAabb(x, nextZ, radius, wall))) z = nextZ;
  if (clampRadius != null) {
    const dist = Math.hypot(x, z);
    if (dist > clampRadius) {
      const scale = clampRadius / dist;
      x *= scale;
      z *= scale;
    }
  }
  return { x, z };
}

export function clampToAabb(x: number, z: number, box: Aabb, radius: number): { x: number; z: number } {
  return {
    x: Math.min(box.maxX - radius, Math.max(box.minX + radius, x)),
    z: Math.min(box.maxZ - radius, Math.max(box.minZ + radius, z)),
  };
}

export function nearPoint(x: number, z: number, tx: number, tz: number, radius: number): boolean {
  return Math.hypot(x - tx, z - tz) <= radius;
}
