import { describe, expect, it } from "vitest";
import { computeStackedSpritePlacement } from "@/lib/topdown/stacked-individual-layout";
import {
  atlasCropBackgroundStyleScaled,
  atlasCropLayerStyle,
  snapDetectedBoundsToCanonical,
  spriteBackgroundPositionScaled,
  spriteBackgroundSizeScaled,
} from "@/lib/topdown/sprite-utils";

const ATLAS = {
  imageSrc: "/assets/wke/example-terrain-sheet.png",
  width: 1536,
  height: 1024,
} as const;

const BOUNDS = { sx: 20, sy: 20, sw: 88, sh: 88 };
const WALK = { insetX: 6, insetY: 16, width: 76, height: 38 };

describe("sprite-utils scaled atlas rendering", () => {
  it("scales background position and size with display scale", () => {
    const scale = 64 / WALK.width;
    expect(spriteBackgroundPositionScaled(BOUNDS, scale)).toBe(`-${BOUNDS.sx * scale}px -${BOUNDS.sy * scale}px`);
    expect(spriteBackgroundSizeScaled(ATLAS, scale)).toBe(`${ATLAS.width * scale}px ${ATLAS.height * scale}px`);
  });

  it("atlas crop layer matches stacked placement dimensions", () => {
    const placement = computeStackedSpritePlacement(BOUNDS.sw, BOUNDS.sh, WALK, 64);
    const layer = atlasCropLayerStyle(ATLAS, BOUNDS, placement.scale);
    const scaledBg = atlasCropBackgroundStyleScaled(ATLAS, BOUNDS, placement.scale);

    expect(layer.width).toBe(BOUNDS.sw);
    expect(layer.height).toBe(BOUNDS.sh);
    expect(layer.transform).toBe(`scale(${placement.scale})`);
    expect(scaledBg.width).toBe(Math.round(BOUNDS.sw * placement.scale));
    expect(scaledBg.height).toBe(Math.round(BOUNDS.sh * placement.scale));
    expect(scaledBg.backgroundPosition).toBe(spriteBackgroundPositionScaled(BOUNDS, placement.scale));
  });

  it("snaps near-miss autodetect sizes to canonical atlas dimensions", () => {
    const canonical = { sx: 20, sy: 20, sw: 88, sh: 88 };
    const detected = { sx: 18, sy: 19, sw: 95, sh: 104 };
    expect(snapDetectedBoundsToCanonical(detected, canonical, 1536, 1024)).toEqual({
      sx: 18,
      sy: 19,
      sw: 88,
      sh: 88,
    });
  });

  it("leaves detected bounds when size differs beyond tolerance", () => {
    const canonical = { sx: 20, sy: 20, sw: 88, sh: 88 };
    const detected = { sx: 20, sy: 20, sw: 120, sh: 120 };
    expect(snapDetectedBoundsToCanonical(detected, canonical, 1536, 1024)).toEqual(detected);
  });
});
