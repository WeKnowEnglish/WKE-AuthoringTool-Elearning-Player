import type { BufferGeometry } from "three";
import type { Vec3 } from "@/lib/character/character-types";
import type { HeadSculptStroke } from "./kit-types";

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

function withMirrors(strokes: HeadSculptStroke[]): HeadSculptStroke[] {
  const out: HeadSculptStroke[] = [];
  for (const stroke of strokes) {
    out.push(stroke);
    if (stroke.mirror === false || Math.abs(stroke.origin[0]) < 0.04) continue;
    out.push({
      id: `${stroke.id}_mirror`,
      origin: [-stroke.origin[0], stroke.origin[1], stroke.origin[2]],
      radius: stroke.radius,
      delta: [-stroke.delta[0], stroke.delta[1], stroke.delta[2]],
      mirror: false,
    });
  }
  return out;
}

/** Soft radial pushes on the dense skull. Topology stays closed. */
export function applySculptStrokes(geometry: BufferGeometry, strokes: HeadSculptStroke[]): BufferGeometry {
  if (strokes.length === 0) return geometry;
  const positions = geometry.getAttribute("position");
  if (!positions) return geometry;
  const applied = withMirrors(strokes);

  for (let index = 0; index < positions.count; index += 1) {
    let x = positions.getX(index);
    let y = positions.getY(index);
    let z = positions.getZ(index);
    for (const stroke of applied) {
      const d = dist3(x, y, z, stroke.origin);
      if (d >= stroke.radius) continue;
      const weight = smoothstep(1 - d / Math.max(0.0001, stroke.radius));
      x += stroke.delta[0] * weight;
      y += stroke.delta[1] * weight;
      z += stroke.delta[2] * weight;
    }
    positions.setXYZ(index, x, y, z);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function parseSculptStrokes(raw: unknown): HeadSculptStroke[] {
  if (!Array.isArray(raw)) return [];
  const strokes: HeadSculptStroke[] = [];
  for (let index = 0; index < Math.min(48, raw.length); index += 1) {
    const item = raw[index];
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<HeadSculptStroke>;
    const origin = Array.isArray(row.origin) && row.origin.length === 3 ? row.origin : null;
    const delta = Array.isArray(row.delta) && row.delta.length === 3 ? row.delta : null;
    if (!origin || !delta) continue;
    const radius = typeof row.radius === "number" && Number.isFinite(row.radius) ? row.radius : 0.2;
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `sculpt_${index + 1}`;
    strokes.push({
      id,
      origin: [
        Math.min(1.4, Math.max(-1.4, Number(origin[0]) || 0)),
        Math.min(1.4, Math.max(-1.4, Number(origin[1]) || 0)),
        Math.min(1.4, Math.max(-1.4, Number(origin[2]) || 0)),
      ],
      radius: Math.min(0.8, Math.max(0.03, radius)),
      delta: [
        Math.min(0.4, Math.max(-0.4, Number(delta[0]) || 0)),
        Math.min(0.4, Math.max(-0.4, Number(delta[1]) || 0)),
        Math.min(0.4, Math.max(-0.4, Number(delta[2]) || 0)),
      ],
      mirror: row.mirror !== false,
    });
  }
  return strokes;
}
