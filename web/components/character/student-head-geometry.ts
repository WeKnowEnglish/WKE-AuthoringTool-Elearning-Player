import type { HeadRegions } from "@/lib/character/kit/kit-types";
import { SphereGeometry, Vector3 } from "three";
import { HEAD_RADIUS } from "./student-head-landmarks";

export const DEFAULT_HEAD_REGIONS: HeadRegions = { crown: 1, cheeks: 1, chin: 1 };

const WIDTH_SEGMENTS = 48;
const HEIGHT_SEGMENTS = 36;

function smooth(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function bump(point: Vector3, center: Vector3, radius: number): number {
  const distance = point.distanceTo(center);
  if (distance >= radius) return 0;
  return smooth(1 - distance / radius);
}

const CHEEK_L = new Vector3(-0.36, -0.08, 0.46);
const CHEEK_R = new Vector3(0.36, -0.08, 0.46);
const CHIN = new Vector3(0, -0.58, 0.38);
const CHEEK_DIR_L = new Vector3(-0.7, -0.05, 0.55).normalize();
const CHEEK_DIR_R = new Vector3(0.7, -0.05, 0.55).normalize();

/**
 * Smooth toy-style kid cranium. Soft egg, no studio brow/jaw/socket sculpt.
 * Region amounts are kit multipliers (1 = default look).
 */
export function buildStudentHeadGeometry(regions: HeadRegions = DEFAULT_HEAD_REGIONS): SphereGeometry {
  const geometry = new SphereGeometry(HEAD_RADIUS, WIDTH_SEGMENTS, HEIGHT_SEGMENTS);
  const positions = geometry.attributes.position;
  const point = new Vector3();
  const crownAmount = regions.crown;
  const cheekAmount = regions.cheeks;
  const chinAmount = regions.chin;

  for (let index = 0; index < positions.count; index += 1) {
    point.fromBufferAttribute(positions, index);

    point.x *= 1.02;
    point.y *= 1.08;
    point.z *= 0.96;

    if (point.y > 0.05) {
      const crown = smooth((point.y - 0.05) / 0.75);
      point.y += crown * 0.06 * crownAmount;
      point.x *= 1 - crown * 0.02 * crownAmount;
    }

    if (point.z > 0.2) {
      const face = smooth((point.z - 0.2) / 0.55);
      point.z -= face * 0.035;
    }

    const cheek = bump(point, CHEEK_L, 0.3) + bump(point, CHEEK_R, 0.3);
    if (cheek > 0) {
      point.addScaledVector(point.x < 0 ? CHEEK_DIR_L : CHEEK_DIR_R, cheek * 0.045 * cheekAmount);
    }

    const chin = bump(point, CHIN, 0.24);
    point.y -= chin * 0.035 * chinAmount;
    point.z += chin * 0.02 * chinAmount;

    positions.setXYZ(index, point.x, point.y, point.z);
  }

  geometry.computeVertexNormals();
  return geometry;
}

export const STUDENT_HEAD_VERTEX_COUNT = (WIDTH_SEGMENTS + 1) * (HEIGHT_SEGMENTS + 1);
