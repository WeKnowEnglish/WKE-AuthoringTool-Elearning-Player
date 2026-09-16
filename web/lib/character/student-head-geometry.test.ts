import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import {
  buildStudentHeadGeometry,
  STUDENT_HEAD_VERTEX_COUNT,
} from "@/components/character/student-head-geometry";
import { HEAD_LANDMARKS, HEAD_RADIUS } from "@/components/character/student-head-landmarks";

describe("student head geometry", () => {
  it("builds a single sculpted mesh in the expected size range", () => {
    const geometry = buildStudentHeadGeometry();
    expect(geometry.attributes.position.count).toBe(STUDENT_HEAD_VERTEX_COUNT);

    const bounds = new Box3().setFromBufferAttribute(geometry.attributes.position);
    const size = bounds.getSize(new Vector3());
    expect(size.y).toBeGreaterThan(HEAD_RADIUS * 1.6);
    expect(size.y).toBeLessThan(HEAD_RADIUS * 2.4);
    expect(size.x).toBeGreaterThan(HEAD_RADIUS * 1.5);
    geometry.dispose();
  });

  it("taller crown inflate raises the bounding box", () => {
    const low = buildStudentHeadGeometry({ crown: 0, cheeks: 1, chin: 1 });
    const high = buildStudentHeadGeometry({ crown: 2.4, cheeks: 1, chin: 1 });
    const lowSize = new Box3().setFromBufferAttribute(low.attributes.position).getSize(new Vector3());
    const highSize = new Box3().setFromBufferAttribute(high.attributes.position).getSize(new Vector3());
    expect(highSize.y).toBeGreaterThan(lowSize.y + 0.04);
    low.dispose();
    high.dispose();
  });

  it("keeps face landmarks on the front of the head", () => {
    expect(HEAD_LANDMARKS.leftEye[2]).toBeGreaterThan(0.45);
    expect(HEAD_LANDMARKS.nose[2]).toBeGreaterThan(HEAD_LANDMARKS.leftEye[2]);
    expect(HEAD_LANDMARKS.mouth[1]).toBeLessThan(HEAD_LANDMARKS.nose[1]);
  });
});
