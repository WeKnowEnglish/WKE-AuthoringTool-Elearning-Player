import { LiveObject } from "@liveblocks/client";
import type { LiveGameSessionState } from "@/lib/live-game/liveblocks/config";
import { createEnglishCraftResourceNodes } from "@/lib/live-game/liveblocks/initial-storage";
import type { LiveGameMutatorRoot } from "@/lib/live-game/server/mutator";

/** Reset wood, nodes, craft, and victory fields for a new round. */
export function resetEnglishCraftGameplayState(storage: LiveGameMutatorRoot) {
  const resourcePool = storage.get("resourcePool");
  if (resourcePool) {
    resourcePool.set("wood", 0);
  } else {
    storage.set("resourcePool", new LiveObject({ wood: 0 }));
  }

  storage.set("resourceNodes", createEnglishCraftResourceNodes());

  const craftedItems = storage.get("craftedItems");
  if (craftedItems) {
    craftedItems.set("bridge", false);
  } else {
    storage.set("craftedItems", new LiveObject({ bridge: false }));
  }

  const unlockedObjects = storage.get("unlockedObjects");
  if (unlockedObjects) {
    unlockedObjects.set("river_crossing", false);
  } else {
    storage.set("unlockedObjects", new LiveObject({ river_crossing: false }));
  }
}

export function resetEnglishCraftVictoryFields(session: {
  set: (key: keyof LiveGameSessionState, value: LiveGameSessionState[keyof LiveGameSessionState]) => void;
}) {
  session.set("objectiveCompleted", false);
  session.set("victoryAt", null);
  session.set("completedByPlayerId", null);
}
