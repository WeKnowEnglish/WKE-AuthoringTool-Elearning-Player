import { describe, expect, it } from "vitest";
import {
  clampStackPresetToCrop,
  defaultAtlasTileStackPreset,
  lipRegionInCrop,
  migrateLegacyStackPreset,
  resolveStackPresetAfterDetect,
  resolveStackPresetForCrop,
  updateWalkInPreset,
  walkBottom,
} from "@/lib/topdown/atlas-tile-layout";

describe("atlas-tile-layout", () => {
  it("creates default walk + lip split for faux-3D tiles", () => {
    const preset = defaultAtlasTileStackPreset(88, 88);
    expect(preset.lipStartY).toBe(walkBottom(preset.walk));
    expect(lipRegionInCrop(preset, 88, 88)?.h).toBeGreaterThan(0);
  });

  it("migrates legacy footprint presets", () => {
    const preset = migrateLegacyStackPreset(
      {
        footprint: { x: 6, y: 16, w: 76, h: 38 },
        layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
      },
      88,
      88,
    );
    expect(preset.walk).toEqual({ insetX: 6, insetY: 16, width: 76, height: 38 });
    expect(preset.lipStartY).toBe(54);
  });

  it("syncs lip line when walk bottom moves and lip was attached", () => {
    const preset = defaultAtlasTileStackPreset(88, 88);
    const updated = updateWalkInPreset(preset, { height: preset.walk.height + 4 }, 88, 88);
    expect(updated.lipStartY).toBe(walkBottom(updated.walk));
  });

  it("clamps walk and lip to crop size", () => {
    const preset = clampStackPresetToCrop(
      {
        walk: { insetX: 0, insetY: 0, width: 120, height: 120 },
        lipStartY: 100,
        layout: { logicalTilePx: 64, lipOverlapPx: 20, columnOverlapPx: 99 },
      },
      88,
      88,
    );
    expect(preset.walk.width).toBe(88);
    expect(preset.lipStartY).toBeLessThanOrEqual(88);
    expect(preset.layout.lipOverlapPx).toBeLessThan(64);
  });

  it("uses file preset after detect when crop size matches canonical", () => {
    const filePreset = migrateLegacyStackPreset(
      {
        footprint: { x: 6, y: 16, w: 76, h: 38 },
        layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
      },
      88,
      88,
    );
    const canonical = { sx: 20, sy: 20, sw: 88, sh: 88 };
    const detected = { sx: 22, sy: 21, sw: 88, sh: 88 };
    const resolved = resolveStackPresetAfterDetect(detected, canonical, filePreset);
    expect(resolved.walk).toEqual(filePreset.walk);
  });

  it("generates fresh walk preset when detect crop size differs", () => {
    const filePreset = migrateLegacyStackPreset(
      {
        footprint: { x: 6, y: 16, w: 76, h: 38 },
        layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
      },
      88,
      88,
    );
    const canonical = { sx: 20, sy: 20, sw: 88, sh: 88 };
    const detected = { sx: 20, sy: 20, sw: 95, sh: 104 };
    const resolved = resolveStackPresetAfterDetect(detected, canonical, filePreset);
    expect(resolved.walk.width).not.toBe(filePreset.walk.width);
    expect(resolved.lipStartY).toBe(walkBottom(resolved.walk));
  });

  it("keeps session preset when only crop position changes", () => {
    const filePreset = migrateLegacyStackPreset(
      {
        footprint: { x: 6, y: 16, w: 76, h: 38 },
        layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
      },
      88,
      88,
    );
    const session = { ...filePreset, walk: { ...filePreset.walk, insetX: 10 } };
    const previous = { sx: 20, sy: 20, sw: 88, sh: 88 };
    const moved = { sx: 116, sy: 20, sw: 88, sh: 88 };
    const resolved = resolveStackPresetForCrop({
      source: "manual-walk",
      crop: moved,
      canonicalBounds: previous,
      filePreset,
      sessionPreset: session,
      previousCrop: previous,
    });
    expect(resolved.walk.insetX).toBe(10);
  });

  it("re-resolves preset when crop size changes manually", () => {
    const filePreset = migrateLegacyStackPreset(
      {
        footprint: { x: 6, y: 16, w: 76, h: 38 },
        layout: { logicalTilePx: 64, lipOverlapPx: 10, columnOverlapPx: 0 },
      },
      88,
      88,
    );
    const previous = { sx: 20, sy: 20, sw: 88, sh: 88 };
    const resized = { sx: 20, sy: 20, sw: 80, sh: 88 };
    const resolved = resolveStackPresetForCrop({
      source: "manual-crop",
      crop: resized,
      canonicalBounds: previous,
      filePreset,
      sessionPreset: filePreset,
      previousCrop: previous,
    });
    expect(resolved.walk.width).toBeLessThanOrEqual(80);
  });
});
