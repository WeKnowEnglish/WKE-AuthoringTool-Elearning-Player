export type AlbedoClass = "hair" | "skin" | "eye" | "other";
export type MeshPart = "hair" | "face";

export type ClassCounts = Record<AlbedoClass, number>;

export function emptyClassCounts(): ClassCounts {
  return { hair: 0, skin: 0, eye: 0, other: 0 };
}

function fract(value: number): number {
  return value - Math.floor(value);
}

export function classifyAlbedo(r: number, g: number, b: number): AlbedoClass {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum > 0.78 && chroma < 0.22) return "eye";
  if (lum < 0.14 && chroma < 0.12) return "eye";
  if (r > 0.52 && r > g + 0.04 && g > b && lum > 0.42) return "skin";
  if (r > g && g >= b - 0.02 && lum < 0.55 && chroma > 0.06 && r - b > 0.07) return "hair";
  return "other";
}

export function islandKind(counts: ClassCounts): MeshPart {
  const faceScore = counts.skin + counts.eye;
  return faceScore >= counts.hair ? "face" : "hair";
}

export function isLikelyFaceVertex(x: number, y: number, z: number): boolean {
  return z > 0.02 && y < 0.3 && y > -0.62;
}

export function seedVertexPart(cls: AlbedoClass, x: number, y: number, z: number): MeshPart {
  if (cls === "skin" || cls === "eye") return "face";
  if (cls === "hair" && isLikelyFaceVertex(x, y, z)) return "face";
  return "hair";
}

export function assignTrianglePartsFromVertices(indices: number[], vertexParts: MeshPart[]): MeshPart[] {
  const parts: MeshPart[] = [];
  const triCount = Math.floor(indices.length / 3);
  for (let tri = 0; tri < triCount; tri += 1) {
    let hair = 0;
    let face = 0;
    for (let corner = 0; corner < 3; corner += 1) {
      if (vertexParts[indices[tri * 3 + corner]!] === "hair") hair += 1;
      else face += 1;
    }
    parts.push(hair > face ? "hair" : "face");
  }
  return parts;
}

export function triangleCentroid(
  indices: number[],
  positions: number[],
  tri: number,
): [number, number, number] {
  const a = indices[tri * 3]!;
  const b = indices[tri * 3 + 1]!;
  const c = indices[tri * 3 + 2]!;
  return [
    (positions[a * 3]! + positions[b * 3]! + positions[c * 3]!) / 3,
    (positions[a * 3 + 1]! + positions[b * 3 + 1]! + positions[c * 3 + 1]!) / 3,
    (positions[a * 3 + 2]! + positions[b * 3 + 2]! + positions[c * 3 + 2]!) / 3,
  ];
}

function triangleAdjacency(indices: number[]): number[][] {
  const triCount = Math.floor(indices.length / 3);
  const edgeToTri = new Map<string, number[]>();
  for (let tri = 0; tri < triCount; tri += 1) {
    const verts = [indices[tri * 3]!, indices[tri * 3 + 1]!, indices[tri * 3 + 2]!];
    for (let edge = 0; edge < 3; edge += 1) {
      const key = undirectedVertEdge(verts[edge]!, verts[(edge + 1) % 3]!);
      const list = edgeToTri.get(key) ?? [];
      list.push(tri);
      edgeToTri.set(key, list);
    }
  }
  const adj: number[][] = Array.from({ length: triCount }, () => []);
  for (const tris of edgeToTri.values()) {
    if (tris.length !== 2) continue;
    adj[tris[0]!]!.push(tris[1]!);
    adj[tris[1]!]!.push(tris[0]!);
  }
  return adj;
}

/** Grow hair and face from confident seeds so shadowed cheeks don't speckle. */
export function assignTrianglePartsFlood(
  indices: number[],
  vertexParts: MeshPart[],
  positions: number[],
): MeshPart[] {
  const triCount = Math.floor(indices.length / 3);
  const seeded: Array<MeshPart | null> = Array.from({ length: triCount }, () => null);
  for (let tri = 0; tri < triCount; tri += 1) {
    let hair = 0;
    for (let corner = 0; corner < 3; corner += 1) {
      if (vertexParts[indices[tri * 3 + corner]!] === "hair") hair += 1;
    }
    const [x, y, z] = triangleCentroid(indices, positions, tri);
    if (hair === 3 && !isLikelyFaceVertex(x, y, z)) seeded[tri] = "hair";
    else if (hair === 0 && (isLikelyFaceVertex(x, y, z) || y < 0.12)) seeded[tri] = "face";
  }
  const adj = triangleAdjacency(indices);
  const queue: number[] = [];
  const parts: Array<MeshPart | null> = seeded.slice();
  for (let tri = 0; tri < triCount; tri += 1) {
    if (parts[tri]) queue.push(tri);
  }
  for (let index = 0; index < queue.length; index += 1) {
    const tri = queue[index]!;
    const part = parts[tri]!;
    for (const neighbor of adj[tri] ?? []) {
      if (parts[neighbor]) continue;
      parts[neighbor] = part;
      queue.push(neighbor);
    }
  }
  return parts.map((part, tri) => part ?? assignTrianglePartsFromVertices(indices.slice(tri * 3, tri * 3 + 3), vertexParts)[0]!);
}

export function sampleRgb(
  pixels: Uint8Array | Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  u: number,
  v: number,
): [number, number, number] {
  const x = Math.min(width - 1, Math.max(0, Math.round(fract(u) * (width - 1))));
  const y = Math.min(height - 1, Math.max(0, Math.round((1 - fract(v)) * (height - 1))));
  const index = (y * width + x) * 4;
  return [(pixels[index] ?? 0) / 255, (pixels[index + 1] ?? 0) / 255, (pixels[index + 2] ?? 0) / 255];
}

function uvKey(u: number, v: number): string {
  return `${Math.round(u * 100000)}:${Math.round(v * 100000)}`;
}

function undirectedUvEdge(u0: number, v0: number, u1: number, v1: number): string {
  const a = uvKey(u0, v0);
  const b = uvKey(u1, v1);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

class UnionFind {
  private readonly parent: Int32Array;

  constructor(count: number) {
    this.parent = new Int32Array(count);
    for (let index = 0; index < count; index += 1) this.parent[index] = index;
  }

  find(index: number): number {
    let cursor = index;
    while (this.parent[cursor] !== cursor) {
      this.parent[cursor] = this.parent[this.parent[cursor]!]!;
      cursor = this.parent[cursor]!;
    }
    return cursor;
  }

  union(a: number, b: number) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent[rootB] = rootA;
  }
}

/** Group triangles that share UV edges. Hairline 3D neighbors stay split if UVs differ. */
export function groupUvIslands(indices: number[], uvs: number[]): Int32Array {
  const triCount = Math.floor(indices.length / 3);
  const sets = new UnionFind(triCount);
  const edgeToTri = new Map<string, number>();
  for (let tri = 0; tri < triCount; tri += 1) {
    const verts = [indices[tri * 3]!, indices[tri * 3 + 1]!, indices[tri * 3 + 2]!];
    for (let edge = 0; edge < 3; edge += 1) {
      const a = verts[edge]!;
      const b = verts[(edge + 1) % 3]!;
      const key = undirectedUvEdge(uvs[a * 2]!, uvs[a * 2 + 1]!, uvs[b * 2]!, uvs[b * 2 + 1]!);
      const existing = edgeToTri.get(key);
      if (existing === undefined) edgeToTri.set(key, tri);
      else sets.union(tri, existing);
    }
  }
  const remap = new Map<number, number>();
  const islandOf = new Int32Array(triCount);
  let next = 0;
  for (let tri = 0; tri < triCount; tri += 1) {
    const root = sets.find(tri);
    let island = remap.get(root);
    if (island === undefined) {
      island = next;
      next += 1;
      remap.set(root, island);
    }
    islandOf[tri] = island;
  }
  return islandOf;
}

export function assignTriangleParts(
  indices: number[],
  classes: AlbedoClass[],
  islandOf: Int32Array,
): MeshPart[] {
  const islandCounts = new Map<number, ClassCounts>();
  const triCount = Math.floor(indices.length / 3);
  for (let tri = 0; tri < triCount; tri += 1) {
    const island = islandOf[tri]!;
    const counts = islandCounts.get(island) ?? emptyClassCounts();
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = indices[tri * 3 + corner]!;
      counts[classes[vertex] ?? "other"] += 1;
    }
    islandCounts.set(island, counts);
  }
  const islandPart = new Map<number, MeshPart>();
  for (const [island, counts] of islandCounts) islandPart.set(island, islandKind(counts));
  const parts: MeshPart[] = [];
  for (let tri = 0; tri < triCount; tri += 1) {
    parts.push(islandPart.get(islandOf[tri]!) ?? "face");
  }
  return parts;
}

export function compactSubmesh(
  positions: number[],
  normals: number[] | null,
  uvs: number[] | null,
  indices: number[],
  keepTri: boolean[],
): { positions: number[]; normals: number[] | null; uvs: number[] | null; indices: number[] } {
  const used = new Uint8Array(positions.length / 3);
  for (let tri = 0; tri < keepTri.length; tri += 1) {
    if (!keepTri[tri]) continue;
    used[indices[tri * 3]!] = 1;
    used[indices[tri * 3 + 1]!] = 1;
    used[indices[tri * 3 + 2]!] = 1;
  }
  const remap = new Int32Array(used.length).fill(-1);
  const nextPositions: number[] = [];
  const nextNormals: number[] = [];
  const nextUvs: number[] = [];
  let kept = 0;
  for (let vertex = 0; vertex < used.length; vertex += 1) {
    if (!used[vertex]) continue;
    remap[vertex] = kept;
    kept += 1;
    nextPositions.push(positions[vertex * 3]!, positions[vertex * 3 + 1]!, positions[vertex * 3 + 2]!);
    if (normals) nextNormals.push(normals[vertex * 3]!, normals[vertex * 3 + 1]!, normals[vertex * 3 + 2]!);
    if (uvs) nextUvs.push(uvs[vertex * 2]!, uvs[vertex * 2 + 1]!);
  }
  const nextIndices: number[] = [];
  for (let tri = 0; tri < keepTri.length; tri += 1) {
    if (!keepTri[tri]) continue;
    nextIndices.push(remap[indices[tri * 3]!]!, remap[indices[tri * 3 + 1]!]!, remap[indices[tri * 3 + 2]!]!);
  }
  return {
    positions: nextPositions,
    normals: normals ? nextNormals : null,
    uvs: uvs ? nextUvs : null,
    indices: nextIndices,
  };
}

/** Drop unused vertices after index-list edits (clip / y-cut). */
export function compactIndexedMesh(
  positions: number[],
  normals: number[] | null,
  uvs: number[] | null,
  indices: number[],
): { positions: number[]; normals: number[] | null; uvs: number[] | null; indices: number[] } {
  const triCount = Math.floor(indices.length / 3);
  const keepTri = Array.from({ length: triCount }, () => true);
  return compactSubmesh(positions, normals, uvs, indices, keepTri);
}

function undirectedVertEdge(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function findBoundaryLoops(indices: number[]): number[][] {
  const undirected = new Map<string, number>();
  const directed: Array<[number, number]> = [];
  for (let i = 0; i < indices.length; i += 3) {
    const tri: Array<[number, number]> = [
      [indices[i]!, indices[i + 1]!],
      [indices[i + 1]!, indices[i + 2]!],
      [indices[i + 2]!, indices[i]!],
    ];
    for (const [a, b] of tri) {
      const key = undirectedVertEdge(a, b);
      undirected.set(key, (undirected.get(key) ?? 0) + 1);
    }
    directed.push(...tri);
  }
  const next = new Map<number, number[]>();
  for (const [a, b] of directed) {
    if ((undirected.get(undirectedVertEdge(a, b)) ?? 0) !== 1) continue;
    const list = next.get(a) ?? [];
    list.push(b);
    next.set(a, list);
  }
  const loops: number[][] = [];
  const used = new Set<string>();
  for (const [start, targets] of next) {
    for (const first of targets) {
      const seed = `${start}>${first}`;
      if (used.has(seed)) continue;
      const loop = [start];
      let current = start;
      let following = first;
      while (following !== start) {
        used.add(`${current}>${following}`);
        loop.push(following);
        const options = next.get(following) ?? [];
        const followingEdge = options.find((vertex) => !used.has(`${following}>${vertex}`));
        if (followingEdge === undefined) break;
        current = following;
        following = followingEdge;
        if (loop.length > indices.length) break;
      }
      used.add(`${current}>${following}`);
      if (loop.length >= 3) loops.push(loop);
    }
  }
  return loops;
}

function newellNormal(positions: number[], loop: number[]): [number, number, number] {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let index = 0; index < loop.length; index += 1) {
    const a = loop[index]!;
    const b = loop[(index + 1) % loop.length]!;
    const ax = positions[a * 3]!;
    const ay = positions[a * 3 + 1]!;
    const az = positions[a * 3 + 2]!;
    const bx = positions[b * 3]!;
    const by = positions[b * 3 + 1]!;
    const bz = positions[b * 3 + 2]!;
    nx += (ay - by) * (az + bz);
    ny += (az - bz) * (ax + bx);
    nz += (ax - bx) * (ay + by);
  }
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

function averageNormal(normals: number[] | null, loop: number[]): [number, number, number] {
  if (!normals) return [0, 1, 0];
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (const vertex of loop) {
    nx += normals[vertex * 3] ?? 0;
    ny += normals[vertex * 3 + 1] ?? 0;
    nz += normals[vertex * 3 + 2] ?? 0;
  }
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

/** Move leftover temple/crown curls off the Face mesh so the scalp can own them. */
export function reclaimHairFromFace(
  indices: number[],
  positions: number[],
  parts: MeshPart[],
  hairlineY: number,
  classes?: AlbedoClass[],
): number {
  let moved = 0;
  for (let tri = 0; tri < parts.length; tri += 1) {
    if (parts[tri] !== "face") continue;
    const [x, y, z] = triangleCentroid(indices, positions, tri);
    if (y > hairlineY) {
      parts[tri] = "hair";
      moved += 1;
      continue;
    }
    if (!classes) continue;
    let hairCorners = 0;
    for (let corner = 0; corner < 3; corner += 1) {
      if (classes[indices[tri * 3 + corner]!] === "hair") hairCorners += 1;
    }
    const onFace = isLikelyFaceVertex(x, y, z);
    const sideburn = onFace && Math.abs(x) > 0.36 && z < 0.38 && y > -0.08;
    if (hairCorners < 2) continue;
    if (onFace && !sideburn) continue;
    parts[tri] = "hair";
    moved += 1;
  }
  return moved;
}

/**
 * Fan-fill open holes on the face mesh (hairline + neck) with skin-colored UVs.
 */
export function capBoundaryLoops(
  positions: number[],
  normals: number[] | null,
  uvs: number[] | null,
  indices: number[],
  capUv: [number, number],
  minLoop = 8,
  maxCentroidY?: number,
): number {
  const loops = findBoundaryLoops(indices).filter((loop) => loop.length >= minLoop);
  let filled = 0;
  for (const source of loops) {
    const loop = source.slice();
    const plane = newellNormal(positions, loop);
    const outward = averageNormal(normals, loop);
    if (plane[0] * outward[0] + plane[1] * outward[1] + plane[2] * outward[2] < 0) loop.reverse();
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const vertex of loop) {
      cx += positions[vertex * 3]!;
      cy += positions[vertex * 3 + 1]!;
      cz += positions[vertex * 3 + 2]!;
    }
    const count = loop.length;
    cx /= count;
    cy /= count;
    cz /= count;
    if (maxCentroidY !== undefined && cy > maxCentroidY) continue;
    const center = positions.length / 3;
    positions.push(cx, cy, cz);
    const flipped = newellNormal(positions, loop);
    if (normals) normals.push(...flipped);
    if (uvs) uvs.push(capUv[0], capUv[1]);
    for (let index = 0; index < loop.length; index += 1) {
      indices.push(center, loop[index]!, loop[(index + 1) % loop.length]!);
    }
    filled += 1;
  }
  return filled;
}

export function meanUvForClass(uvs: number[], classes: AlbedoClass[], wanted: AlbedoClass): [number, number] {
  let u = 0;
  let v = 0;
  let count = 0;
  for (let vertex = 0; vertex < classes.length; vertex += 1) {
    if (classes[vertex] !== wanted) continue;
    u += uvs[vertex * 2]!;
    v += uvs[vertex * 2 + 1]!;
    count += 1;
  }
  if (count === 0) return [0.5, 0.5];
  return [u / count, v / count];
}
