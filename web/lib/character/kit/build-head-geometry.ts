import { BufferAttribute, BufferGeometry } from "three";
import { densifyProfileRings } from "./head-profile";
import type { HeadProfileRing } from "./kit-types";

/** Seed head is ~15.6k verts / ~25.3k tris. Match that density on the lathe. */
export const HEAD_MESH_LATITUDES = 96;
export const HEAD_MESH_RADIAL = 128;

export type HeadGeometryOptions = {
  latitudes?: number;
  segments?: number;
  /** Pure elliptical rings — no front-face flatten (smoother vinyl bust). */
  circular?: boolean;
};

/**
 * Builds a closed skull from latitude rings. Pole fans cap chin and crown
 * so the surface stays continuous — no open rims.
 */
export function buildHeadGeometryFromProfile(
  rings: HeadProfileRing[],
  segmentsOrOptions: number | HeadGeometryOptions = HEAD_MESH_RADIAL,
): BufferGeometry {
  if (rings.length < 2) {
    return new BufferGeometry();
  }
  const options: HeadGeometryOptions =
    typeof segmentsOrOptions === "number" ? { segments: segmentsOrOptions } : segmentsOrOptions;
  const latitudes = options.latitudes ?? HEAD_MESH_LATITUDES;
  const segments = options.segments ?? HEAD_MESH_RADIAL;
  const circular = options.circular === true;
  const meshRings = densifyProfileRings(rings, latitudes);
  const positions: number[] = [];
  const first = meshRings[0]!;
  const last = meshRings[meshRings.length - 1]!;
  positions.push(0, first.y, first.z ?? 0);
  for (const ring of meshRings) {
    for (let spoke = 0; spoke < segments; spoke += 1) {
      const angle = (spoke / segments) * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      // Mild front soften for toy faces; circular for blank vinyl busts.
      const power = circular ? 1 : sine > 0 ? 0.92 : 1;
      const px = Math.sign(cosine) * Math.pow(Math.abs(cosine), power);
      const pz = Math.sign(sine) * Math.pow(Math.abs(sine), power);
      positions.push(ring.rx * px, ring.y, (ring.z ?? 0) + ring.rz * pz);
    }
  }
  positions.push(0, last.y, last.z ?? 0);

  const south = 0;
  const north = 1 + meshRings.length * segments;
  const indices: number[] = [];
  for (let spoke = 0; spoke < segments; spoke += 1) {
    const a = 1 + spoke;
    const b = 1 + ((spoke + 1) % segments);
    indices.push(south, b, a);
  }
  for (let ring = 0; ring < meshRings.length - 1; ring += 1) {
    for (let spoke = 0; spoke < segments; spoke += 1) {
      const a = 1 + ring * segments + spoke;
      const b = 1 + ring * segments + ((spoke + 1) % segments);
      const c = 1 + (ring + 1) * segments + spoke;
      const d = 1 + (ring + 1) * segments + ((spoke + 1) % segments);
      indices.push(a, c, b, b, c, d);
    }
  }
  const lastRing = 1 + (meshRings.length - 1) * segments;
  for (let spoke = 0; spoke < segments; spoke += 1) {
    const a = lastRing + spoke;
    const b = lastRing + ((spoke + 1) % segments);
    indices.push(north, a, b);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function profileHeadVertexCount(ringCount = HEAD_MESH_LATITUDES, segments = HEAD_MESH_RADIAL): number {
  return ringCount * segments + 2;
}

export function profileHeadTriangleCount(ringCount = HEAD_MESH_LATITUDES, segments = HEAD_MESH_RADIAL): number {
  return 2 * segments + (ringCount - 1) * segments * 2;
}
