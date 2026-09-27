import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from "three";
import { landmassColor, landmassField, landmassHeight, type LandmassKind, type LandmassZone } from "./island-shape";
import { wrapAuthoredOffset } from "./sphere-wrap";

const SKIRT_LIFT = 0.0018;
const VERTEX_COLOR = new Color();

export type BuildLandmassOptions = {
  kind: LandmassKind;
  zone: LandmassZone;
  originLat: number;
  originLon: number;
  yaw: number;
  globeRadius: number;
  unitsToRadians: number;
  grid: number;
  extent: number;
};

function sample(ix: number, iz: number, grid: number, extent: number): { x: number; z: number } {
  return {
    x: -extent + (2 * extent * ix) / grid,
    z: -extent + (2 * extent * iz) / grid,
  };
}

function wrapPoint(
  x: number,
  z: number,
  height: number,
  options: BuildLandmassOptions,
): [number, number, number] {
  const wrapped = wrapAuthoredOffset(
    options.originLat,
    options.originLon,
    x,
    z,
    options.yaw,
    options.unitsToRadians,
  );
  const radius = options.globeRadius + height;
  return [wrapped.normal.x * radius, wrapped.normal.y * radius, wrapped.normal.z * radius];
}

/**
 * One terrain mesh: jagged coastline, hills, and a downward skirt for cliff faces.
 * Vertices are projected onto the ocean sphere so the island rides the globe.
 */
export function buildIslandGeometry(options: BuildLandmassOptions): BufferGeometry {
  const { kind, grid, extent } = options;
  const stride = grid + 1;
  const field = new Float32Array(stride * stride);
  const height = new Float32Array(stride * stride);
  const inside = new Uint8Array(stride * stride);

  for (let iz = 0; iz <= grid; iz += 1) {
    for (let ix = 0; ix <= grid; ix += 1) {
      const { x, z } = sample(ix, iz, grid, extent);
      const index = iz * stride + ix;
      const value = landmassField(kind, x, z);
      field[index] = value;
      inside[index] = value > 0 ? 1 : 0;
      height[index] = landmassHeight(kind, x, z, value);
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const pushVertex = (x: number, z: number, lift: number, color: readonly [number, number, number]) => {
    positions.push(...wrapPoint(x, z, lift, options));
    VERTEX_COLOR.setRGB(color[0], color[1], color[2], SRGBColorSpace);
    colors.push(VERTEX_COLOR.r, VERTEX_COLOR.g, VERTEX_COLOR.b);
    return positions.length / 3 - 1;
  };

  const slopeAt = (ix: number, iz: number) => {
    const left = height[iz * stride + Math.max(0, ix - 1)];
    const right = height[iz * stride + Math.min(grid, ix + 1)];
    const down = height[Math.max(0, iz - 1) * stride + ix];
    const up = height[Math.min(grid, iz + 1) * stride + ix];
    return Math.hypot(right - left, up - down) * (grid / (2 * extent));
  };

  const topIndex = new Int32Array(stride * stride).fill(-1);

  for (let iz = 0; iz <= grid; iz += 1) {
    for (let ix = 0; ix <= grid; ix += 1) {
      const index = iz * stride + ix;
      if (!inside[index]) continue;
      const { x, z } = sample(ix, iz, grid, extent);
      const color = landmassColor(kind, x, z, field[index], height[index], slopeAt(ix, iz), options.zone);
      topIndex[index] = pushVertex(x, z, height[index], color);
    }
  }

  const edgeUses = new Map<string, [number, number, number, number]>();

  const addEdge = (ax: number, az: number, bx: number, bz: number) => {
    const key = ax < bx || (ax === bx && az < bz) ? `${ax},${az}|${bx},${bz}` : `${bx},${bz}|${ax},${az}`;
    if (edgeUses.has(key)) edgeUses.delete(key);
    else edgeUses.set(key, [ax, az, bx, bz]);
  };

  const emitTriangle = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number) => {
    const ia = topIndex[az * stride + ax];
    const ib = topIndex[bz * stride + bx];
    const ic = topIndex[cz * stride + cx];
    if (ia < 0 || ib < 0 || ic < 0) return;
    indices.push(ia, ib, ic);
    addEdge(ax, az, bx, bz);
    addEdge(bx, bz, cx, cz);
    addEdge(cx, cz, ax, az);
  };

  for (let iz = 0; iz < grid; iz += 1) {
    for (let ix = 0; ix < grid; ix += 1) {
      const i00 = iz * stride + ix;
      const i10 = iz * stride + ix + 1;
      const i01 = (iz + 1) * stride + ix;
      const i11 = (iz + 1) * stride + ix + 1;
      const filled = inside[i00] + inside[i10] + inside[i01] + inside[i11];
      if (filled === 4) {
        emitTriangle(ix, iz, ix + 1, iz, ix + 1, iz + 1);
        emitTriangle(ix, iz, ix + 1, iz + 1, ix, iz + 1);
      } else if (filled === 3) {
        if (!inside[i00]) emitTriangle(ix + 1, iz, ix + 1, iz + 1, ix, iz + 1);
        else if (!inside[i10]) emitTriangle(ix, iz, ix + 1, iz + 1, ix, iz + 1);
        else if (!inside[i01]) emitTriangle(ix, iz, ix + 1, iz, ix + 1, iz + 1);
        else emitTriangle(ix, iz, ix + 1, iz, ix, iz + 1);
      }
    }
  }

  for (const [ax, az, bx, bz] of edgeUses.values()) {
    const { x: x0, z: z0 } = sample(ax, az, grid, extent);
    const { x: x1, z: z1 } = sample(bx, bz, grid, extent);
    const aTop = topIndex[az * stride + ax];
    const bTop = topIndex[bz * stride + bx];
    if (aTop < 0 || bTop < 0) continue;

    const aColor = landmassColor(kind, x0, z0, field[az * stride + ax], height[az * stride + ax], 0.9, options.zone);
    const bColor = landmassColor(kind, x1, z1, field[bz * stride + bx], height[bz * stride + bx], 0.9, options.zone);
    const aBottom = pushVertex(x0, z0, SKIRT_LIFT, aColor);
    const bBottom = pushVertex(x1, z1, SKIRT_LIFT, bColor);
    indices.push(aTop, aBottom, bTop);
    indices.push(bTop, aBottom, bBottom);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
