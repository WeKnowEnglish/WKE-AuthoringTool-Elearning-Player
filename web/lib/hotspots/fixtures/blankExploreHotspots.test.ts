import { describe, expect, it } from "vitest";
import { createBlankExploreHotspotsDocument } from "./blankExploreHotspots";
import { validateExploreHotspotsDocument } from "../studio";

describe("createBlankExploreHotspotsDocument", () => {
  it("produces a valid explore-hotspots document", () => {
    const doc = validateExploreHotspotsDocument(createBlankExploreHotspotsDocument());
    expect(doc.name).toBe("Untitled explore hotspots");
    expect(doc.layout.elements.some((element) => element.kind === "hotspot")).toBe(true);
    expect(doc.assets.length).toBeGreaterThan(0);
  });
});
