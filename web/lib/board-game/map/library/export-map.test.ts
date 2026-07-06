import { describe, expect, it } from "vitest";
import { getDefaultMapForPathStyle } from "@/lib/board-game/map/default-maps";
import {
  assertMapImportRoundTrip,
  parseMapImport,
  prepareImportedMap,
  serializeMapExport,
} from "@/lib/board-game/map/library/export-map";
import { setPathTileOverride } from "@/lib/board-game/map/path-tile-overrides";
import { setTerrainTileOverride } from "@/lib/board-game/map/terrain-tile-overrides";

describe("export-map", () => {
  const map = getDefaultMapForPathStyle("short");

  it("serializes and parses a valid export file", () => {
    const raw = serializeMapExport(map, "Exported Short");
    const result = parseMapImport(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.title).toBe("Exported Short");
    expect(result.map.id).toBe(map.id);
  });

  it("round-trips overrides through export format", () => {
    const richMap = setTerrainTileOverride(
      setPathTileOverride(map, 1, 0, "path_r0c1"),
      1,
      0,
      "wke_grass_flowers",
    );
    const roundTripped = assertMapImportRoundTrip(richMap);
    expect(roundTripped.pathTileOverrides).toEqual(richMap.pathTileOverrides);
    expect(roundTripped.terrainTileOverrides).toEqual(richMap.terrainTileOverrides);
  });

  it("rejects invalid json", () => {
    expect(parseMapImport("{ not json").ok).toBe(false);
  });

  it("assigns a new custom id on import", () => {
    const prepared = prepareImportedMap(map, "Imported Copy");
    expect(prepared.id.startsWith("custom-")).toBe(true);
    expect(prepared.id).not.toBe(map.id);
    expect(prepared.title).toBe("Imported Copy");
  });
});
