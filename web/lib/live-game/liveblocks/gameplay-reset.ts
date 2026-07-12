import { LiveObject } from "@liveblocks/client";
import type { LiveGameSessionState } from "@/lib/live-game/liveblocks/config";
import { createEnglishCraftResourceNodes } from "@/lib/live-game/liveblocks/initial-storage";
import type { LiveGameMutatorRoot } from "@/lib/live-game/server/mutator";
import { clearAllPlayerHunger, clearAllPlayerInventory } from "@/lib/live-game/server/clear-player-maps";
import { clearAllPlayerCarry } from "@/lib/live-game/server/player-carry";
import { DEFAULT_LIVE_GAME_CRAFTED_ITEMS } from "@/lib/live-game/server/read-crafted-items";
import { EMPTY_LIVE_GAME_RESOURCE_POOL } from "@/lib/live-game/resource-pool";

/** Reset pool, nodes, carry, craft, and victory fields for a new round. */
export function resetEnglishCraftGameplayState(storage: LiveGameMutatorRoot) {
  const resourcePool = storage.get("resourcePool");
  if (resourcePool) {
    for (const [key, value] of Object.entries(EMPTY_LIVE_GAME_RESOURCE_POOL)) {
      resourcePool.set(key, value);
    }
  } else {
    storage.set("resourcePool", new LiveObject({ ...EMPTY_LIVE_GAME_RESOURCE_POOL }));
  }

  storage.set("resourceNodes", createEnglishCraftResourceNodes());
  clearAllPlayerCarry(storage);
  clearAllPlayerInventory(storage);
  clearAllPlayerHunger(storage);

  const craftedItems = storage.get("craftedItems");
  if (craftedItems) {
    for (const [key, value] of Object.entries(DEFAULT_LIVE_GAME_CRAFTED_ITEMS)) {
      craftedItems.set(key, value);
    }
  } else {
    storage.set("craftedItems", new LiveObject({ ...DEFAULT_LIVE_GAME_CRAFTED_ITEMS }));
  }

  const unlockedObjects = storage.get("unlockedObjects");
  if (unlockedObjects) {
    unlockedObjects.set("river_crossing", false);
    unlockedObjects.set("boat_boarding", false);
  } else {
    storage.set("unlockedObjects", new LiveObject({ river_crossing: false, boat_boarding: false }));
  }
}

export function resetEnglishCraftVictoryFields(session: {
  set: (key: keyof LiveGameSessionState, value: LiveGameSessionState[keyof LiveGameSessionState]) => void;
}) {
  session.set("objectiveCompleted", false);
  session.set("victoryAt", null);
  session.set("completedByPlayerId", null);
}
