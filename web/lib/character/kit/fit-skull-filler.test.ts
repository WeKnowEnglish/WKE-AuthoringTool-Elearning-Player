import { describe, expect, it } from "vitest";
import { DEFAULT_HEAD_PROFILE } from "./head-profile";
import {
  buildSkullFillerMesh,
  dropTrianglesAboveY,
  fitSkullProfile,
  scanPointCloud,
  skullFillerCoversCrown,
  toyProfileSpan,
} from "./fit-skull-filler";

function ellipsoid(rx: number, ry: number, rz: number, count = 800): number[] {
  const positions: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const u = (i / count) * Math.PI * 2;
    const v = ((i * 7) % count) / count * Math.PI;
    positions.push(rx * Math.cos(u) * Math.sin(v), ry * Math.cos(v), rz * Math.sin(u) * Math.sin(v));
  }
  return positions;
}

describe("fit-skull-filler", () => {
  it("scans an ellipsoid into standing Y-up rings", () => {
    const scan = scanPointCloud(ellipsoid(0.8, 0.9, 0.7));
    expect(scan.size[1]).toBeGreaterThan(scan.size[2] * 0.9);
    expect(scan.rings.length).toBeGreaterThanOrEqual(7);
    const mid = scan.rings[Math.floor(scan.rings.length / 2)]!;
    expect(mid.rx).toBeGreaterThan(0.3);
  });

  it("fits the toy skull between a cut face and the original head height", () => {
    const original = scanPointCloud(ellipsoid(0.88, 0.9, 0.8));
    const faceOnly: number[] = [];
    const source = ellipsoid(0.88, 0.9, 0.8, 900);
    for (let i = 0; i < source.length; i += 3) {
      if (source[i + 1]! < 0.2) faceOnly.push(source[i]!, source[i + 1]!, source[i + 2]!);
    }
    const face = scanPointCloud(faceOnly);
    const fitted = fitSkullProfile(face, original);
    expect(fitted.rings.length).toBe(DEFAULT_HEAD_PROFILE.length);
    expect(skullFillerCoversCrown(face, fitted.rings)).toBe(true);
    expect(fitted.joinY).toBeGreaterThan(fitted.rings[0]!.y);
    expect(fitted.joinY).toBeLessThan(fitted.rings[fitted.rings.length - 1]!.y);
    const toy = toyProfileSpan();
    expect(fitted.rings[fitted.rings.length - 1]!.y - fitted.rings[0]!.y).toBeGreaterThan(toy.maxY - toy.minY - 0.35);
    expect(fitted.rings[Math.floor(fitted.rings.length / 2)]!.rx).toBeGreaterThan(0.35);
    const withHairline = fitSkullProfile(face, original, undefined, 0.22);
    expect(withHairline.joinY).toBeCloseTo(0.22, 2);
  });

  it("builds a closed lathe and drops crown shards", () => {
    const mesh = buildSkullFillerMesh(
      [
        { y: -0.7, rx: 0.2, rz: 0.18 },
        { y: 0, rx: 0.7, rz: 0.65 },
        { y: 0.7, rx: 0.12, rz: 0.12 },
      ],
      [0.4, 0.4],
      8,
    );
    expect(mesh.positions.length).toBe(3 * 8 * 3);
    expect(mesh.indices.length).toBeGreaterThan(0);
    const clipped = dropTrianglesAboveY([0, 0, 0, 0, 1, 0, 0, 0.2, 0, 0, 0.9, 0], [0, 2, 3, 1, 3, 2], 0.5);
    expect(clipped).toEqual([0, 2, 3]);
  });

  it("opens a face window on the lathe so the painted face is not covered", () => {
    const full = buildSkullFillerMesh(
      [
        { y: -0.7, rx: 0.5, rz: 0.5 },
        { y: 0.2, rx: 0.7, rz: 0.7 },
        { y: 0.7, rx: 0.12, rz: 0.12 },
      ],
      [0.4, 0.4],
      12,
    );
    const windowed = buildSkullFillerMesh(
      [
        { y: -0.7, rx: 0.5, rz: 0.5 },
        { y: 0.2, rx: 0.7, rz: 0.7 },
        { y: 0.7, rx: 0.12, rz: 0.12 },
      ],
      [0.4, 0.4],
      12,
      { joinY: 0.2 },
    );
    expect(windowed.indices.length).toBeLessThan(full.indices.length);
    for (let i = 0; i < windowed.indices.length; i += 3) {
      const y =
        (windowed.positions[windowed.indices[i]! * 3 + 1]! +
          windowed.positions[windowed.indices[i + 1]! * 3 + 1]! +
          windowed.positions[windowed.indices[i + 2]! * 3 + 1]!) /
        3;
      const z =
        (windowed.positions[windowed.indices[i]! * 3 + 2]! +
          windowed.positions[windowed.indices[i + 1]! * 3 + 2]! +
          windowed.positions[windowed.indices[i + 2]! * 3 + 2]!) /
        3;
      if (y < 0.2) expect(z).toBeLessThanOrEqual(0.02);
    }
  });
});
