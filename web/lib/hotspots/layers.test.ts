import { describe, expect, it } from "vitest";
import {
  effectiveZIndex,
  nextZIndex,
  reorderZIndex,
  sortHotspotsBackToFront,
  sortHotspotsFrontToBack,
} from "./layers";
import type { HotspotElement } from "./types";

function hotspot(
  id: string,
  patch: Partial<HotspotElement> = {},
): HotspotElement {
  return {
    id,
    kind: "hotspot",
    regionId: "main-media",
    geometry: { shape: "rectangle", x: 0, y: 0, width: 0.2, height: 0.2 },
    ...patch,
  };
}

describe("hotspot layers", () => {
  it("sorts back-to-front by zIndex with stable fallbacks", () => {
    const list = [
      hotspot("a", { zIndex: 2 }),
      hotspot("b", { tabOrder: 1 }),
      hotspot("c", { zIndex: 5 }),
    ];
    expect(sortHotspotsBackToFront(list).map((h) => h.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(sortHotspotsFrontToBack(list).map((h) => h.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("assigns next z above the current max", () => {
    expect(nextZIndex([])).toBe(0);
    expect(nextZIndex([hotspot("a", { zIndex: 3 }), hotspot("b", { zIndex: 1 })])).toBe(
      4,
    );
  });

  it("reorders and renormalizes zIndex values", () => {
    const list = [
      hotspot("back", { zIndex: 0 }),
      hotspot("mid", { zIndex: 1 }),
      hotspot("front", { zIndex: 2 }),
    ];
    const forward = reorderZIndex(list, "mid", "forward");
    expect(forward).toEqual({ front: 1, mid: 2 });

    const toBack = reorderZIndex(list, "front", "back");
    expect(toBack).toEqual({ front: 0, back: 1, mid: 2 });
  });

  it("returns null when already at the edge", () => {
    const list = [hotspot("only", { zIndex: 0 })];
    expect(reorderZIndex(list, "only", "forward")).toBeNull();
    expect(effectiveZIndex(hotspot("x"), 4)).toBe(4);
  });
});
