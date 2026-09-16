import { classifyAlbedo, isLikelyFaceVertex, sampleRgb, type AlbedoClass } from "./extract-hair-from-glb";

export type HighlightRegion = "face" | "parts" | "hair";

export type RegionHighlightFlags = {
  face: boolean;
  parts: boolean;
  hair: boolean;
};

export const NO_REGION_HIGHLIGHTS: RegionHighlightFlags = { face: false, parts: false, hair: false };

export const HIGHLIGHT_HEX: Record<HighlightRegion, string> = {
  face: "#3b82f6",
  parts: "#22c55e",
  hair: "#f59e0b",
};

export const HIGHLIGHT_RGB: Record<HighlightRegion, [number, number, number]> = {
  face: [0.23, 0.51, 0.96],
  parts: [0.13, 0.77, 0.37],
  hair: [0.96, 0.62, 0.07],
};

export function anyRegionHighlight(flags: RegionHighlightFlags): boolean {
  return flags.face || flags.parts || flags.hair;
}

export function isEarVertex(x: number, y: number, z: number): boolean {
  return Math.abs(x) > 0.52 && y > -0.32 && y < 0.28 && z < 0.28 && z > -0.35;
}

export function isBrowVertex(cls: AlbedoClass, x: number, y: number, z: number): boolean {
  return cls === "hair" && z > 0.18 && y > 0.06 && y < 0.26 && Math.abs(x) < 0.4;
}

export function isMouthVertex(x: number, y: number, z: number): boolean {
  return z > 0.32 && y < -0.1 && y > -0.36 && Math.abs(x) < 0.24;
}

export function isNoseVertex(x: number, y: number, z: number): boolean {
  return z > 0.48 && y > -0.1 && y < 0.08 && Math.abs(x) < 0.14;
}

/** Face skin vs eyes/brows/nose/mouth/ears vs hair volume. */
export function classifyHighlightRegion(cls: AlbedoClass, x: number, y: number, z: number): HighlightRegion {
  if (isEarVertex(x, y, z)) return "parts";
  if (cls === "eye" && isLikelyFaceVertex(x, y, z)) return "parts";
  if (isBrowVertex(cls, x, y, z)) return "parts";
  if (isMouthVertex(x, y, z)) return "parts";
  if (isNoseVertex(x, y, z)) return "parts";
  if (cls === "hair" && Math.abs(x) > 0.38) return "hair";
  if (cls === "skin" && isLikelyFaceVertex(x, y, z)) return "face";
  if (cls === "hair" && isLikelyFaceVertex(x, y, z)) return "face";
  return "hair";
}

export function majorityRegion(a: HighlightRegion, b: HighlightRegion, c: HighlightRegion): HighlightRegion {
  if (a === b || a === c) return a;
  if (b === c) return b;
  return a;
}

export function regionFromObjectName(name: string, parentName?: string): HighlightRegion {
  const haystack = `${parentName ?? ""}/${name}`;
  if (haystack.includes("kitHair") || haystack.includes("hairShell") || name.startsWith("tuft")) return "hair";
  if (haystack.includes("kitFace")) return "parts";
  return "face";
}

type SampleRgb = (u: number, v: number) => [number, number, number];

function vertexRegion(
  positions: ArrayLike<number>,
  uvs: ArrayLike<number> | null,
  vertex: number,
  sample: SampleRgb | null,
): HighlightRegion {
  const x = positions[vertex * 3]!;
  const y = positions[vertex * 3 + 1]!;
  const z = positions[vertex * 3 + 2]!;
  if (!sample || !uvs) {
    if (isEarVertex(x, y, z) || isMouthVertex(x, y, z) || isNoseVertex(x, y, z)) return "parts";
    return isLikelyFaceVertex(x, y, z) ? "face" : "hair";
  }
  const cls = classifyAlbedo(...sample(uvs[vertex * 2]!, uvs[vertex * 2 + 1]!));
  return classifyHighlightRegion(cls, x, y, z);
}

/** Pack a flat overlay mesh of only the enabled region triangles. */
export function collectHighlightedTriangles(
  positions: ArrayLike<number>,
  uvs: ArrayLike<number> | null,
  indices: ArrayLike<number> | null,
  sample: SampleRgb | null,
  enabled: RegionHighlightFlags,
): { positions: number[]; colors: number[] } {
  const outPositions: number[] = [];
  const colors: number[] = [];
  const pushTri = (a: number, b: number, c: number) => {
    const region = majorityRegion(
      vertexRegion(positions, uvs, a, sample),
      vertexRegion(positions, uvs, b, sample),
      vertexRegion(positions, uvs, c, sample),
    );
    if (!enabled[region]) return;
    const rgb = HIGHLIGHT_RGB[region];
    for (const vertex of [a, b, c]) {
      outPositions.push(positions[vertex * 3]!, positions[vertex * 3 + 1]!, positions[vertex * 3 + 2]!);
      colors.push(rgb[0], rgb[1], rgb[2]);
    }
  };
  if (indices && indices.length >= 3) {
    for (let i = 0; i < indices.length; i += 3) pushTri(indices[i]!, indices[i + 1]!, indices[i + 2]!);
  } else {
    const vertCount = Math.floor(positions.length / 3);
    for (let vertex = 0; vertex + 2 < vertCount; vertex += 3) pushTri(vertex, vertex + 1, vertex + 2);
  }
  return { positions: outPositions, colors };
}

export function sampleFromImageData(
  pixels: Uint8Array | Uint8ClampedArray | Buffer,
  width: number,
  height: number,
): SampleRgb {
  return (u, v) => sampleRgb(pixels, width, height, u, v);
}
