import { describe, expect, it } from "vitest";
import { ENGLISH_CRAFT_RESOURCE_NODES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import {
  ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS,
  ENGLISH_CRAFT_LOBBY_RESOURCE_NODES,
  createEnglishCraftLobbyResourceNodes,
  resolveEnglishCraftMapVisuals,
} from "@/lib/live-game/modes/english-craft/lobby-map-v1";

describe("english-craft lobby map visuals", () => {
  it("provides a full-node snapshot for every resource node", () => {
    const nodes = createEnglishCraftLobbyResourceNodes();
    expect(Object.keys(nodes)).toHaveLength(ENGLISH_CRAFT_RESOURCE_NODES_V1.length);
    for (const nodeDef of ENGLISH_CRAFT_RESOURCE_NODES_V1) {
      const node = nodes[nodeDef.id];
      expect(node?.available).toBe(true);
      expect(node?.cooldownEndsAt).toBeNull();
      expect(node?.collectedCount).toBe(0);
      expect(node?.resourceType).toBe(nodeDef.resourceType);
    }
  });

  it("keeps lobby crafted items at defaults", () => {
    expect(ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS.benchBuilt).toBe(false);
    expect(ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS.boat).toBe(false);
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
      craftedItems: {
        benchBuilt: true,
        hammers: 5,
        boat: true,
      },
    });
    expect(resolved.resourceNodes).toBe(ENGLISH_CRAFT_LOBBY_RESOURCE_NODES);
    expect(resolved.craftedItems).toBe(ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS);
  });

  it("passes through playing visuals from storage", () => {
    const resourceNodes = ENGLISH_CRAFT_LOBBY_RESOURCE_NODES;
    const craftedItems = {
      benchBuilt: true,
      hammers: 2,
      boat: false,
    };
    const resolved = resolveEnglishCraftMapVisuals({
      visualMode: "playing",
      resourceNodes,
      craftedItems,
    });
    expect(resolved.resourceNodes).toBe(resourceNodes);
    expect(resolved.craftedItems).toBe(craftedItems);
  });
});
