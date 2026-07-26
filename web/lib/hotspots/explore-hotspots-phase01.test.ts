import { describe, expect, it } from "vitest";
import {
  carveExcludePoints,
  filterSeedsOnForeground,
  fillSmallMaskHoles,
  findMaskRescueSeed,
  hotspotGeometrySeedPoints,
  maskHasEnclosedHole,
  postprocessHotspotMask,
} from "@wke/explore-hotspots-author";
import {
  contoursToSvgPath,
  pickHotspotId,
  pointInHotspotGeometry,
  type PlayHotspot,
} from "@wke/explore-hotspots-play";

function makeDonutMask(size = 32, outer = 12, inner = 5): Uint8Array {
  const mask = new Uint8Array(size * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r <= outer && r >= inner) mask[y * size + x] = 255;
    }
  }
  return mask;
}

describe("explore-hotspots author mask / seeds", () => {
  it("keeps enclosed holes when hole-fill is disabled", () => {
    const size = 32;
    const donut = makeDonutMask(size);
    expect(maskHasEnclosedHole(donut, size, size)).toBe(true);

    const filled = fillSmallMaskHoles(donut, size, size, size * size);
    expect(maskHasEnclosedHole(filled, size, size)).toBe(false);

    const preserved = postprocessHotspotMask(donut, size, size, [{ x: 16, y: 16, label: 0 }], {
      fillSmallHoles: false,
      excludeCarveRadius: 0,
    });
    expect(maskHasEnclosedHole(preserved, size, size)).toBe(true);
  });

  it("carves exclude points so negatives survive postprocess", () => {
    const width = 20;
    const height = 20;
    const solid = new Uint8Array(width * height).fill(255);
    const carved = carveExcludePoints(solid, width, height, [{ x: 10, y: 10, label: 0 }], 3);
    expect(carved[10 * width + 10]).toBe(0);
    expect(carved[10 * width + 13]).toBe(0);
    expect(carved[0]).toBe(255);
  });

  it("drops auto seeds that land in the donut hole", () => {
    const size = 32;
    const donut = makeDonutMask(size);
    const seeds = [
      { x: 0.5, y: 0.5 }, // hole center
      { x: 0.5, y: 0.22 }, // near top ring
    ];
    const filtered = filterSeedsOnForeground(seeds, donut, size, size, 2);
    expect(filtered.dropped.some((seed) => seed.x === 0.5 && seed.y === 0.5)).toBe(true);
  });

  it("rescues a seed from the largest foreground ring blob", () => {
    const size = 32;
    const donut = makeDonutMask(size);
    const rescue = findMaskRescueSeed(donut, size, size);
    expect(rescue).not.toBeNull();
    expect(maskHasEnclosedHole(donut, size, size)).toBe(true);
    // Rescue should land on ring, not dead-center hole.
    const cx = rescue!.x * size;
    const cy = rescue!.y * size;
    const r = Math.hypot(cx - (size - 1) / 2, cy - (size - 1) / 2);
    expect(r).toBeGreaterThan(4);
  });

  it("generates three centerline seeds for a rectangle", () => {
    const seeds = hotspotGeometrySeedPoints({
      shape: "rectangle",
      x: 0.2,
      y: 0.1,
      width: 0.4,
      height: 0.6,
    });
    expect(seeds).toHaveLength(3);
    expect(seeds.every((seed) => Math.abs(seed.x - 0.4) < 1e-9)).toBe(true);
  });
});

describe("explore-hotspots play hit policy", () => {
  const hotspot: PlayHotspot = {
    id: "ring",
    accessibleLabel: "Ring",
    geometry: {
      shape: "rectangle",
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.6,
    },
    visualShape: {
      type: "segmentation-contour",
      sourceAssetId: "media",
      sourceWidth: 100,
      sourceHeight: 100,
      // Outer square + inner hole (evenodd display). Center of geometry is in the hole visually.
      paths: [
        [
          { x: 0.25, y: 0.25 },
          { x: 0.75, y: 0.25 },
          { x: 0.75, y: 0.75 },
          { x: 0.25, y: 0.75 },
        ],
        [
          { x: 0.4, y: 0.4 },
          { x: 0.6, y: 0.4 },
          { x: 0.6, y: 0.6 },
          { x: 0.4, y: 0.6 },
        ],
      ],
    },
  };

  it("hits using geometry even when the click is in a contour hole", () => {
    expect(pickHotspotId({ x: 0.5, y: 0.5 }, [hotspot])).toBe("ring");
  });

  it("misses outside geometry even if somehow near a contour", () => {
    expect(pickHotspotId({ x: 0.05, y: 0.05 }, [hotspot])).toBeNull();
  });

  it("uses a true ellipse, not an AABB", () => {
    const ellipse: PlayHotspot = {
      id: "oval",
      geometry: { shape: "ellipse", cx: 0.5, cy: 0.5, rx: 0.3, ry: 0.2 },
    };
    expect(pointInHotspotGeometry({ x: 0.5, y: 0.5 }, ellipse.geometry)).toBe(true);
    // Corner of AABB is outside the ellipse.
    expect(pointInHotspotGeometry({ x: 0.8, y: 0.7 }, ellipse.geometry)).toBe(false);
    expect(pickHotspotId({ x: 0.8, y: 0.7 }, [ellipse])).toBeNull();
  });

  it("preserves evenodd path data for donut display", () => {
    const d = contoursToSvgPath(hotspot.visualShape!.paths, 1000);
    expect(d.split("M").length - 1).toBe(2);
  });
});
