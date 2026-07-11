import { describe, expect, it } from "vitest";
import { ENGLISH_CRAFT_WOOD_TREES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  ENGLISH_CRAFT_LOBBY_BRIDGE_CRAFTED,
  ENGLISH_CRAFT_LOBBY_RESOURCE_NODES,
  createEnglishCraftLobbyResourceNodes,
  resolveEnglishCraftMapVisuals,
} from "@/lib/live-game/modes/english-craft/lobby-map-v1";

describe("english-craft lobby map visuals", () => {
  it("provides a full-tree snapshot for every wood node", () => {
    const nodes = createEnglishCraftLobbyResourceNodes();
    expect(Object.keys(nodes)).toHaveLength(ENGLISH_CRAFT_WOOD_TREES_V1.length);
    for (const tree of ENGLISH_CRAFT_WOOD_TREES_V1) {
      const node = nodes[tree.id];
      expect(node?.available).toBe(true);
      expect(node?.cooldownEndsAt).toBeNull();
      expect(node?.collectedCount).toBe(0);
    }
  });

  it("keeps lobby bridge unbuilt", () => {
    expect(ENGLISH_CRAFT_LOBBY_BRIDGE_CRAFTED).toBe(false);
  });

  it("ignores live gameplay storage when visual mode is lobby", () => {
    const resolved = resolveEnglishCraftMapVisuals({
      visualMode: "lobby",
      resourceNodes: {
        "tree-01": {
          id: "tree-01",
          resourceType: "wood",
          available: false,
          cooldownEndsAt: Date.now() + 60_000,
          collectedCount: 5,
        },
      },
      bridgeCrafted: true,
    });
    expect(resolved.resourceNodes).toBe(ENGLISH_CRAFT_LOBBY_RESOURCE_NODES);
    expect(resolved.bridgeCrafted).toBe(false);
  });

  it("passes through playing visuals from storage", () => {
    const resourceNodes = ENGLISH_CRAFT_LOBBY_RESOURCE_NODES;
    const resolved = resolveEnglishCraftMapVisuals({
      visualMode: "playing",
      resourceNodes,
      bridgeCrafted: true,
    });
    expect(resolved.resourceNodes).toBe(resourceNodes);
    expect(resolved.bridgeCrafted).toBe(true);
  });
});
