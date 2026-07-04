import { describe, expect, it } from "vitest";
import {
  bumpSpriteRectField,
  clampSpriteRect,
  formatAtlasAssetLine,
} from "@/lib/topdown/bounds-editor-utils";

describe("bounds-editor-utils", () => {
  it("clamps sprite rects inside sheet bounds", () => {
    expect(clampSpriteRect({ sx: 1500, sy: 900, sw: 100, sh: 200 }, 1536, 1024)).toEqual({
      sx: 1436,
      sy: 824,
      sw: 100,
      sh: 200,
    });
  });

  it("bumps individual fields", () => {
    const rect = { sx: 10, sy: 20, sw: 30, sh: 40 };
    expect(bumpSpriteRectField(rect, "sx", 5, 200, 200)).toEqual({
      sx: 15,
      sy: 20,
      sw: 30,
      sh: 40,
    });
  });

  it("formats atlas asset lines for copy/paste", () => {
    expect(formatAtlasAssetLine("soil_plain", { sx: 1, sy: 2, sw: 3, sh: 4 })).toBe(
      "soil_plain: { sx: 1, sy: 2, sw: 3, sh: 4 },",
    );
  });
});
