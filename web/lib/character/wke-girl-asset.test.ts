import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WKE_GIRL_BASE } from "./wke-girl-assets";

function readGlbJson(relativePublicPath: string) {
  const file = readFileSync(join(process.cwd(), "public", relativePublicPath));
  expect(file.toString("utf8", 0, 4)).toBe("glTF");
  const jsonLength = file.readUInt32LE(12);
  return JSON.parse(file.toString("utf8", 20, 20 + jsonLength)) as {
    asset?: { generator?: string };
    meshes?: Array<{
      name?: string;
      primitives?: Array<{ attributes?: Record<string, number>; material?: number }>;
    }>;
    skins?: Array<{ joints?: number[] }>;
    nodes?: Array<{ name?: string }>;
    materials?: unknown[];
  };
}

describe("WKE girl GLB", () => {
  it("preserves the uploaded skinned Mixamo asset", () => {
    const json = readGlbJson(WKE_GIRL_BASE.src.replace(/^\//, ""));
    expect(json.asset?.generator).toBe("Tripo");
    expect(json.meshes).toHaveLength(1);
    expect(json.meshes?.[0]?.name).toBe(WKE_GIRL_BASE.meshName);
    expect(json.meshes?.[0]?.primitives).toHaveLength(1);
    expect(json.meshes?.[0]?.primitives?.[0]?.attributes).toMatchObject({
      JOINTS_0: expect.any(Number),
      WEIGHTS_0: expect.any(Number),
    });
    expect(json.skins?.[0]?.joints).toHaveLength(52);
    expect(json.nodes?.map((node) => node.name)).toEqual(
      expect.arrayContaining([
        "mixamorig:Hips",
        "mixamorig:Spine",
        "mixamorig:Head",
        "mixamorig:LeftArm",
        "mixamorig:RightArm",
        "mixamorig:LeftUpLeg",
        "mixamorig:RightUpLeg",
      ]),
    );
    expect(json.materials).toHaveLength(1);
  });
});
