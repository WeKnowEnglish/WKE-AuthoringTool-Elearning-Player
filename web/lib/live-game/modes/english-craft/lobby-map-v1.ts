import type { LiveGameResourceNodeState } from "@/lib/live-game/liveblocks/config";
import { ENGLISH_CRAFT_WOOD_TREES_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";

/** Plain snapshot: every wood tree full and interactable (no stumps). */
export function createEnglishCraftLobbyResourceNodes(): Record<string, LiveGameResourceNodeState> {
  const nodes: Record<string, LiveGameResourceNodeState> = {};
  for (const tree of ENGLISH_CRAFT_WOOD_TREES_V1) {
    nodes[tree.id] = {
      id: tree.id,
      resourceType: "wood",
      available: true,
      cooldownEndsAt: null,
      collectedCount: 0,
    };
  }
  return nodes;
}

/** Cached lobby snapshot — safe to reuse across renders. */
export const ENGLISH_CRAFT_LOBBY_RESOURCE_NODES = createEnglishCraftLobbyResourceNodes();

export const ENGLISH_CRAFT_LOBBY_BRIDGE_CRAFTED = false;

export type LiveGameMapVisualMode = "playing" | "lobby";

export function resolveEnglishCraftMapVisuals(input: {
  visualMode: LiveGameMapVisualMode;
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  bridgeCrafted: boolean;
}): {
  resourceNodes: Record<string, LiveGameResourceNodeState>;
  bridgeCrafted: boolean;
} {
  if (input.visualMode === "lobby") {
    return {
      resourceNodes: ENGLISH_CRAFT_LOBBY_RESOURCE_NODES,
      bridgeCrafted: ENGLISH_CRAFT_LOBBY_BRIDGE_CRAFTED,
    };
  }
  return {
    resourceNodes: input.resourceNodes,
    bridgeCrafted: input.bridgeCrafted,
  };
}
