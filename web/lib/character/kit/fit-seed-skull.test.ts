import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { buildHeadGeometryFromProfile } from "./build-head-geometry";
import {
  closePoleRings,
  fitClosedSkullProfile,
  keepSkullVertex,
  normalizeSkullProfile,
  smoothProfileRings,
} from "./fit-seed-skull";

function ellipsoid(rx: number, ry: number, rz: number, count = 900): number[] {
  const positions: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const u = (i / count) * Math.PI * 2;
    const v = (((i * 11) % count) / count) * Math.PI;
    positions.push(rx * Math.cos(u) * Math.sin(v), ry * Math.cos(v), rz * Math.sin(u) * Math.sin(v));
  }
  return positions;
}

function boundaryEdges(indices: ArrayLike<number>): number {
  const counts = new Map<string, number>();
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [indices[i]!, indices[i + 1]!, indices[i + 2]!];
    for (let edge = 0; edge < 3; edge += 1) {
      const a = tri[edge]!;
      const b = tri[(edge + 1) % 3]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let open = 0;
  for (const count of counts.values()) if (count === 1) open += 1;
  return open;
}

describe("fit-seed-skull", () => {
  it("drops hair-volume verts and keeps face skin", () => {
    expect(keepSkullVertex("skin", 0.1, 0.02, 0.35)).toBe(true);
    expect(keepSkullVertex("hair", 0.05, 0.55, -0.1)).toBe(false);
    expect(keepSkullVertex("skin", 0.7, 0.02, 0.05)).toBe(false);
  });

  it("fits a closed skull and caps the poles", () => {
    const fitted = fitClosedSkullProfile(ellipsoid(0.7, 0.85, 0.65));
    expect(fitted.length).toBeGreaterThan(8);
    expect(fitted[0]!.rx).toBeLessThan(0.06);
    expect(fitted[fitted.length - 1]!.rx).toBeLessThan(0.06);
    const scaled = normalizeSkullProfile(fitted, 0.78);
    const cheek = scaled.reduce((best, ring) => (ring.rx > best.rx ? ring : best));
    expect(cheek.rx).toBeGreaterThan(0.7);
    expect(cheek.rx).toBeLessThan(0.9);
    for (let index = 2; index < scaled.length - 1; index += 1) {
      expect(Math.abs(scaled[index]!.rx - scaled[index - 1]!.rx)).toBeLessThan(0.32);
    }
    const upper = scaled.find((ring) => ring.y > 0.35 && ring.y < 0.55);
    expect(upper?.rx).toBeGreaterThan(0.4);
  });

  it("builds a watertight lathe with no open rims", () => {
    const rings = closePoleRings(
      smoothProfileRings([
        { y: -0.7, rx: 0.2, rz: 0.18 },
        { y: 0, rx: 0.7, rz: 0.65 },
        { y: 0.7, rx: 0.2, rz: 0.18 },
      ]),
    );
    const geometry = buildHeadGeometryFromProfile(rings);
    expect(boundaryEdges(geometry.getIndex()!.array)).toBe(0);
    const size = new Box3().setFromBufferAttribute(geometry.attributes.position).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(1.2);
    geometry.dispose();
  });
});
