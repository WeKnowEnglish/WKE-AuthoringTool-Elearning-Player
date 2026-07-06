import { describe, expect, it } from "vitest";
import {
  fillerTileForTheme,
  spriteForBoardPathTile,
  terrainTileForPathCell,
} from "@/lib/board-game/render/terrain-tiles";

describe("terrain-tiles", () => {
  const boardLength = 12;

  it("maps start and finish for every theme", () => {
    const themes = ["jungle", "ocean", "space", "castle", "classroom"] as const;
    for (const theme of themes) {
      expect(terrainTileForPathCell({ theme, pathIndex: 0, boardLength })).toBe(
        spriteForBoardPathTile(theme, 0, boardLength),
      );
      expect(
        terrainTileForPathCell({ theme, pathIndex: boardLength, boardLength }),
      ).toBe(spriteForBoardPathTile(theme, boardLength, boardLength));
    }
  });

  it("uses filler on interior path cells by default", () => {
    expect(terrainTileForPathCell({ theme: "jungle", pathIndex: 3, boardLength })).toBe(
      fillerTileForTheme("jungle"),
    );
  });

  it("uses alt terrain for special spaces on interior cells", () => {
    expect(
      terrainTileForPathCell({
        theme: "jungle",
        pathIndex: 4,
        boardLength,
        space: { kind: "bonus" },
      }),
    ).toBe("wke_grass_flowers");
  });

  it("supports full-legacy interior decoration", () => {
    expect(
      terrainTileForPathCell({
        theme: "jungle",
        pathIndex: 2,
        boardLength,
        decoration: "full-legacy",
      }),
    ).toBe("wke_grass_plain");
    expect(
      terrainTileForPathCell({
        theme: "jungle",
        pathIndex: 3,
        boardLength,
        decoration: "full-legacy",
      }),
    ).toBe("wke_grass_flowers");
  });
});
