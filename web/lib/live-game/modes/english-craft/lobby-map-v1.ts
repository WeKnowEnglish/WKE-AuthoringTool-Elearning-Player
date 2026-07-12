import type { LiveGameCraftedItems, LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_RESOURCE_NODES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS } from "@/lib/live-game/server/read-crafted-items";

/** Plain snapshot: every resource node full and interactable (no depleted visuals). */
export function createEnglishCraftLobbyResourceNodes(): Record<string, LiveGameResourceNodeState> {
  const nodes: Record<string, LiveGameResourceNodeState> = {};
  for (const node of ENGLISH_CRAFT_RESOURCE_NODES_V1) {
    nodes[node.id] = {
      id: node.id,
      resourceType: node.resourceType,
      available: true,
      cooldownEndsAt: null,
      collectedCount: 0,
    };
  }
  return nodes;
}

/** Cached lobby snapshot — safe to reuse across renders. */
export const ENGLISH_CRAFT_LOBBY_RESOURCE_NODES = createEnglishCraftLobbyResourceNodes();

export const ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS: LiveGameCraftedItems = {
  ...DEFAULT_LIVE_GAME_CRAFTED_ITEMS,
};

/** @deprecated Use ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS.bridge */
export const ENGLISH_CRAFT_LOBBY_BRIDGE_CRAFTED = ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS.bridge;

export type LiveGameMapVisualMode = "playing" | "lobby";

export function resolveEnglishCraftMapVisuals(input: {
  visualMode: LiveGameMapVisualMode;
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  craftedItems: LiveGameCraftedItems;
}): {
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  craftedItems: LiveGameCraftedItems;
} {
  if (input.visualMode === "lobby") {
    return {
      resourceNodes: ENGLISH_CRAFT_LOBBY_RESOURCE_NODES,
      craftedItems: ENGLISH_CRAFT_LOBBY_CRAFTED_ITEMS,
    };
  }
  return {
    resourceNodes: input.resourceNodes,
    craftedItems: input.craftedItems,
  };
}
