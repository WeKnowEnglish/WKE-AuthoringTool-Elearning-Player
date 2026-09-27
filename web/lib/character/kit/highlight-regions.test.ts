import { describe, expect, it } from "vitest";
import { classifyAlbedo } from "./extract-hair-from-glb";
import {
  classifyHighlightRegion,
  collectHighlightedTriangles,
  majorityRegion,
  regionFromObjectName,
} from "./highlight-regions";

describe("highlight-regions", () => {
  it("puts skin cheeks on face, curls on hair, and eyes on parts", () => {
    expect(classifyHighlightRegion("skin", 0.1, 0.02, 0.35)).toBe("face");
    expect(classifyHighlightRegion("hair", 0.05, 0.55, -0.1)).toBe("hair");
    expect(classifyHighlightRegion("eye", 0.18, 0.06, 0.42)).toBe("parts");
  });

  it("treats brows, nose, mouth, and ears as face parts", () => {
    expect(classifyHighlightRegion("hair", 0.16, 0.14, 0.36)).toBe("parts");
    expect(classifyHighlightRegion("skin", 0.02, 0, 0.55)).toBe("parts");
    expect(classifyHighlightRegion("skin", 0.05, -0.22, 0.4)).toBe("parts");
    expect(classifyHighlightRegion("skin", 0.7, 0.02, 0.05)).toBe("parts");
  });

  it("votes a triangle by majority region", () => {
    expect(majorityRegion("face", "face", "hair")).toBe("face");
    expect(majorityRegion("hair", "parts", "hair")).toBe("hair");
  });

  it("maps procedural kit object names onto regions", () => {
    expect(regionFromObjectName("hairShell", "kitHair")).toBe("hair");
    expect(regionFromObjectName("Mesh", "kitFace")).toBe("parts");
    expect(regionFromObjectName("heroSkull")).toBe("face");
  });

  it("builds an overlay of only enabled triangles", () => {
    const positions = [0, 0, 0.4, 0.1, 0, 0.4, 0, 0.05, 0.4, 0, 0.7, 0, 0.1, 0.7, 0, 0, 0.65, 0];
    const overlay = collectHighlightedTriangles(positions, null, [0, 1, 2, 3, 4, 5], null, {
      face: true,
      parts: false,
      hair: false,
    });
    expect(overlay.positions.length).toBe(9);
    expect(overlay.colors.length).toBe(9);
  });

  it("classifies peach albedo as skin", () => {
    expect(classifyAlbedo(0.91, 0.66, 0.51)).toBe("skin");
  });
});
