import { describe, expect, it } from "vitest";
import {
  assignTrianglePartsFlood,
  assignTrianglePartsFromVertices,
  capBoundaryLoops,
  classifyAlbedo,
  compactSubmesh,
  findBoundaryLoops,
  groupUvIslands,
  reclaimHairFromFace,
  seedVertexPart,
} from "./extract-hair-from-glb";

describe("extract-hair-from-glb", () => {
  it("classifies peach as skin, brown as hair, and sclera as eye", () => {
    expect(classifyAlbedo(0.91, 0.66, 0.51)).toBe("skin");
    expect(classifyAlbedo(0.42, 0.25, 0.14)).toBe("hair");
    expect(classifyAlbedo(0.95, 0.93, 0.9)).toBe("eye");
  });

  it("keeps shadowed cheeks on the face and atlas junk in the hair", () => {
    expect(seedVertexPart("hair", 0.1, 0.05, 0.32)).toBe("face");
    expect(seedVertexPart("hair", 0, 0.6, -0.1)).toBe("hair");
    expect(seedVertexPart("hair", 0, -0.28, 0.3)).toBe("face");
    expect(seedVertexPart("other", 0.2, 0.4, 0.2)).toBe("hair");
    expect(seedVertexPart("skin", 0.2, 0.05, 0.3)).toBe("face");
  });

  it("assigns a triangle by vertex majority", () => {
    expect(assignTrianglePartsFromVertices([0, 1, 2], ["face", "face", "hair"])).toEqual(["face"]);
    expect(assignTrianglePartsFromVertices([0, 1, 2], ["hair", "hair", "face"])).toEqual(["hair"]);
  });

  it("floods a mixed triangle from its seeded neighbor", () => {
    const indices = [0, 1, 2, 2, 1, 3];
    const vertexParts: Array<"hair" | "face"> = ["hair", "hair", "hair", "face"];
    const positions = [0, 0.7, 0, 0.1, 0.7, 0, 0, 0.65, 0.05, 0.1, 0.2, 0.3];
    const parts = assignTrianglePartsFlood(indices, vertexParts, positions);
    expect(parts[0]).toBe("hair");
    expect(parts[1]).toBe("hair");
  });

  it("groups triangles by UV edges, not 3D hairline neighbors", () => {
    const indices = [0, 1, 2, 2, 3, 0, 4, 5, 6];
    const uvs = [
      0.1, 0.1, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2,
      0.8, 0.8, 0.9, 0.8, 0.85, 0.9,
    ];
    const islands = groupUvIslands(indices, uvs);
    expect(islands[0]).toBe(islands[1]);
    expect(islands[2]).not.toBe(islands[0]);
  });

  it("finds the open rim of a single triangle", () => {
    const loops = findBoundaryLoops([0, 1, 2]);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(3);
  });

  it("caps a hole and keeps the original rim", () => {
    const positions = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    const indices = [0, 1, 2, 0, 2, 3];
    const filled = capBoundaryLoops(positions, normals, uvs, indices, [0.4, 0.4], 3);
    expect(filled).toBe(1);
    expect(positions.length).toBe(15);
    expect(indices.length).toBeGreaterThan(6);
  });

  it("compacts only kept triangles", () => {
    const mesh = compactSubmesh(
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 2, 2],
      null,
      [0, 0, 1, 0, 0, 1, 1, 1],
      [0, 1, 2, 1, 2, 3],
      [true, false],
    );
    expect(mesh.positions.length).toBe(9);
    expect(mesh.indices).toEqual([0, 1, 2]);
  });

  it("moves crown face triangles onto hair at the hairline", () => {
    const parts: Array<"hair" | "face"> = ["face", "face"];
    const moved = reclaimHairFromFace(
      [0, 1, 2, 3, 4, 5],
      [0, 0.1, 0.2, 0, 0.1, 0.2, 0, 0.1, 0.2, 0, 0.4, 0, 0, 0.5, 0, 0, 0.45, 0],
      parts,
      0.3,
    );
    expect(moved).toBe(1);
    expect(parts).toEqual(["face", "hair"]);
  });

  it("moves brown temple islands onto hair without stealing brows", () => {
    const parts: Array<"hair" | "face"> = ["face", "face"];
    const classes: Array<"hair" | "skin" | "eye" | "other"> = ["hair", "hair", "hair", "hair", "hair", "skin"];
    const moved = reclaimHairFromFace(
      [0, 1, 2, 3, 4, 5],
      [0.5, 0.08, 0.1, 0.52, 0.08, 0.12, 0.48, 0.1, 0.1, 0.1, 0.12, 0.4, 0.12, 0.12, 0.4, 0.08, 0.1, 0.4],
      parts,
      0.3,
      classes,
    );
    expect(moved).toBe(1);
    expect(parts).toEqual(["hair", "face"]);
  });

  it("moves brown back-of-head shards onto hair and keeps ears", () => {
    const parts: Array<"hair" | "face"> = ["face", "face"];
    const classes: Array<"hair" | "skin" | "eye" | "other"> = ["hair", "hair", "hair", "skin", "skin", "skin"];
    const moved = reclaimHairFromFace(
      [0, 1, 2, 3, 4, 5],
      [0.2, 0.1, -0.2, 0.22, 0.12, -0.18, 0.18, 0.08, -0.22, 0.62, 0.02, 0, 0.66, 0.04, 0.02, 0.6, 0, -0.02],
      parts,
      0.3,
      classes,
    );
    expect(moved).toBe(1);
    expect(parts).toEqual(["hair", "face"]);
  });
});
