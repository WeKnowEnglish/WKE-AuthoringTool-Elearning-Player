import type { BufferGeometry } from "three";
import type { Vec3 } from "@/lib/character/character-types";
import { HEAD_SCULPT_MODES, type HeadSculptMode, type HeadSculptStroke } from "./kit-types";

export const MAX_SCULPT_STROKES = 48;

export type SculptBrush = {
  mode: HeadSculptMode;
  radius: number;
  strength: number;
  mirror: boolean;
};

export const DEFAULT_SCULPT_BRUSH: SculptBrush = {
  mode: "inflate",
  radius: 0.18,
  strength: 0.05,
  mirror: true,
};

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

function clampOrigin(value: unknown): number {
  return Math.min(1.4, Math.max(-1.4, Number(value) || 0));
}

function clampDelta(value: unknown): number {
  return Math.min(0.4, Math.max(-0.4, Number(value) || 0));
}

export function clampSculptStrength(value: number): number {
  if (!Number.isFinite(value)) return 0.05;
  return Math.min(0.4, Math.max(0.005, value));
}

export function sculptModeOf(stroke: HeadSculptStroke): HeadSculptMode {
  return stroke.mode && HEAD_SCULPT_MODES.includes(stroke.mode) ? stroke.mode : "move";
}

export function cloneSculptStrokes(strokes: HeadSculptStroke[]): HeadSculptStroke[] {
  return strokes.map((stroke) => ({
    ...stroke,
    origin: [stroke.origin[0], stroke.origin[1], stroke.origin[2]],
    delta: [stroke.delta[0], stroke.delta[1], stroke.delta[2]],
  }));
}

function withMirrors(strokes: HeadSculptStroke[]): HeadSculptStroke[] {
  const out: HeadSculptStroke[] = [];
  for (const stroke of strokes) {
    out.push(stroke);
    if (stroke.mirror === false || Math.abs(stroke.origin[0]) < 0.04) continue;
    out.push({
      ...stroke,
      id: `${stroke.id}_mirror`,
      origin: [-stroke.origin[0], stroke.origin[1], stroke.origin[2]],
      delta: [-stroke.delta[0], stroke.delta[1], stroke.delta[2]],
      mirror: false,
    });
  }
  return out;
}

function strokeStrength(stroke: HeadSculptStroke): number {
  if (typeof stroke.strength === "number" && Number.isFinite(stroke.strength)) {
    return clampSculptStrength(stroke.strength);
  }
  const length = Math.hypot(stroke.delta[0], stroke.delta[1], stroke.delta[2]);
  return clampSculptStrength(length || 0.05);
}

function applyMove(x: number, y: number, z: number, stroke: HeadSculptStroke, weight: number): Vec3 {
  return [
    x + stroke.delta[0] * weight,
    y + stroke.delta[1] * weight,
    z + stroke.delta[2] * weight,
  ];
}

function applyAlongNormal(
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  amount: number,
): Vec3 {
  const length = Math.hypot(nx, ny, nz) || 1;
  return [x + (nx / length) * amount, y + (ny / length) * amount, z + (nz / length) * amount];
}

/** Soft radial stamps on the dense skull. Topology stays closed. */
export function applySculptStrokes(geometry: BufferGeometry, strokes: HeadSculptStroke[]): BufferGeometry {
  if (strokes.length === 0) return geometry;
  const positions = geometry.getAttribute("position");
  if (!positions) return geometry;
  const applied = withMirrors(strokes);

  for (const stroke of applied) {
    const mode = sculptModeOf(stroke);
    if (mode !== "move") geometry.computeVertexNormals();
    const normals = geometry.getAttribute("normal");
    const strength = strokeStrength(stroke);
    let planeX = 0;
    let planeY = 0;
    let planeZ = 1;
    let planePx = stroke.origin[0];
    let planePy = stroke.origin[1];
    let planePz = stroke.origin[2];
    if (mode === "flatten" && normals) {
      let nx = 0;
      let ny = 0;
      let nz = 0;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      let weightSum = 0;
      for (let index = 0; index < positions.count; index += 1) {
        const px = positions.getX(index);
        const py = positions.getY(index);
        const pz = positions.getZ(index);
        const d = dist3(px, py, pz, stroke.origin);
        if (d >= stroke.radius) continue;
        const fit = 1;
        nx += normals.getX(index) * fit;
        ny += normals.getY(index) * fit;
        nz += normals.getZ(index) * fit;
        cx += px * fit;
        cy += py * fit;
        cz += pz * fit;
        weightSum += fit;
      }
      const length = Math.hypot(nx, ny, nz);
      if (weightSum > 0 && length > 1e-6) {
        planeX = nx / length;
        planeY = ny / length;
        planeZ = nz / length;
        planePx = cx / weightSum;
        planePy = cy / weightSum;
        planePz = cz / weightSum;
      }
    }

    for (let index = 0; index < positions.count; index += 1) {
      let x = positions.getX(index);
      let y = positions.getY(index);
      let z = positions.getZ(index);
      const d = dist3(x, y, z, stroke.origin);
      if (d >= stroke.radius) continue;
      const weight = smoothstep(1 - d / Math.max(0.0001, stroke.radius));
      if (mode === "move") {
        [x, y, z] = applyMove(x, y, z, stroke, weight);
      } else if (mode === "flatten") {
        const offset = (x - planePx) * planeX + (y - planePy) * planeY + (z - planePz) * planeZ;
        const blend = weight * Math.min(1, strength / 0.4);
        x -= planeX * offset * blend;
        y -= planeY * offset * blend;
        z -= planeZ * offset * blend;
      } else if (normals) {
        const amount = strength * weight * (mode === "pinch" ? -1 : 1);
        [x, y, z] = applyAlongNormal(x, y, z, normals.getX(index), normals.getY(index), normals.getZ(index), amount);
      }
      positions.setXYZ(index, x, y, z);
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function parseMode(raw: unknown): HeadSculptMode {
  return typeof raw === "string" && HEAD_SCULPT_MODES.includes(raw as HeadSculptMode)
    ? (raw as HeadSculptMode)
    : "move";
}

export function parseSculptStrokes(raw: unknown): HeadSculptStroke[] {
  if (!Array.isArray(raw)) return [];
  const strokes: HeadSculptStroke[] = [];
  for (let index = 0; index < Math.min(MAX_SCULPT_STROKES, raw.length); index += 1) {
    const item = raw[index];
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<HeadSculptStroke>;
    const origin = Array.isArray(row.origin) && row.origin.length === 3 ? row.origin : null;
    if (!origin) continue;
    const mode = parseMode(row.mode);
    const parsedDelta: Vec3 | null =
      Array.isArray(row.delta) && row.delta.length === 3
        ? [row.delta[0], row.delta[1], row.delta[2]]
        : null;
    const hasDelta = parsedDelta !== null;
    if (mode === "move" && !hasDelta) continue;
    const delta: Vec3 = parsedDelta ?? [0, 0, 0];
    const radius = typeof row.radius === "number" && Number.isFinite(row.radius) ? row.radius : 0.2;
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `sculpt_${index + 1}`;
    const strength =
      typeof row.strength === "number" && Number.isFinite(row.strength)
        ? clampSculptStrength(row.strength)
        : hasDelta
          ? clampSculptStrength(Math.hypot(Number(delta[0]) || 0, Number(delta[1]) || 0, Number(delta[2]) || 0) || 0.05)
          : 0.05;
    strokes.push({
      id,
      origin: [clampOrigin(origin[0]), clampOrigin(origin[1]), clampOrigin(origin[2])],
      radius: Math.min(0.8, Math.max(0.03, radius)),
      delta: [clampDelta(delta[0]), clampDelta(delta[1]), clampDelta(delta[2])],
      mode,
      strength,
      mirror: row.mirror !== false,
    });
  }
  return strokes;
}

export function createSculptStroke(input: {
  origin: Vec3;
  radius: number;
  mode: HeadSculptMode;
  strength: number;
  mirror: boolean;
  normal?: Vec3;
  id?: string;
}): HeadSculptStroke {
  const strength = clampSculptStrength(input.strength);
  const normal = input.normal ?? [0, 0, 1];
  const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
  const delta: Vec3 =
    input.mode === "move"
      ? [
          clampDelta((normal[0] / length) * strength),
          clampDelta((normal[1] / length) * strength),
          clampDelta((normal[2] / length) * strength),
        ]
      : [0, 0, 0];
  return {
    id: input.id ?? `stamp_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`,
    origin: [clampOrigin(input.origin[0]), clampOrigin(input.origin[1]), clampOrigin(input.origin[2])],
    radius: Math.min(0.8, Math.max(0.03, input.radius)),
    delta,
    mode: input.mode,
    strength,
    mirror: input.mirror,
  };
}
