import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGamePlayerHunger, LiveGamePlayerInventory } from "@/lib/live-game/liveblocks/config";
import { reconcilePlayerHunger } from "@/lib/live-game/modes/english-craft/hunger";
import { ENGLISH_CRAFT_HUNGER_MAX } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type AwardConsumeBreadResult = {
  bread: number;
  hunger: number;
};

export async function awardConsumeBread(input: {
  roomId: string;
  playerId: string;
}): Promise<AwardConsumeBreadResult | null> {
  const liveblocks = getLiveblocksServerClient();
  let result: AwardConsumeBreadResult | null = null;
  const now = Date.now();

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session || session.get("phase") !== "playing") {
      return;
    }

    let playerInventory = storage.get("playerInventory");
    if (!playerInventory) {
      playerInventory = new LiveMap() as unknown as LiveGameMutatorNode;
      storage.set("playerInventory", playerInventory);
    }

    let inventoryEntry = playerInventory.get(input.playerId) as LiveGameMutatorNode | undefined;
    if (!inventoryEntry) {
      return;
    }

    const currentBread = readMutatorNumber(inventoryEntry.get("bread"));
    if (currentBread < 1) {
      return;
    }

    const nextBread = currentBread - 1;
    inventoryEntry.set("bread", nextBread);

    let playerHunger = storage.get("playerHunger");
    if (!playerHunger) {
      playerHunger = new LiveMap() as unknown as LiveGameMutatorNode;
      storage.set("playerHunger", playerHunger);
    }

    let hungerEntry = playerHunger.get(input.playerId) as LiveGameMutatorNode | undefined;
    const priorHunger: LiveGamePlayerHunger = hungerEntry ?
      {
        value: readMutatorNumber(hungerEntry.get("value")),
        lastUpdatedAt:
          typeof hungerEntry.get("lastUpdatedAt") === "number" ?
            (hungerEntry.get("lastUpdatedAt") as number)
          : 0,
      }
    : { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: 0 };

    const reconciled = reconcilePlayerHunger(priorHunger, now, true);
    const restored: LiveGamePlayerHunger = {
      value: ENGLISH_CRAFT_HUNGER_MAX,
      lastUpdatedAt: now,
    };

    if (!hungerEntry) {
      hungerEntry = new LiveObject<LiveGamePlayerHunger>(restored) as unknown as LiveGameMutatorNode;
      playerHunger.set(input.playerId, hungerEntry);
    } else {
      hungerEntry.set("value", restored.value);
      hungerEntry.set("lastUpdatedAt", restored.lastUpdatedAt);
    }

    void reconciled;

    result = {
      bread: nextBread,
      hunger: restored.value,
    };
  });

  return result;
}

/** Test helper: simulate eating bread without Liveblocks. */
export function applyConsumeBreadToSnapshot(
  storage: {
    session?: { phase: string };
    playerInventory?: Record<string, LiveGamePlayerInventory>;
    playerHunger?: Record<string, LiveGamePlayerHunger>;
  },
  playerId: string,
  now = Date.now(),
): {
  playerInventory: Record<string, LiveGamePlayerInventory>;
  playerHunger: Record<string, LiveGamePlayerHunger>;
} | null {
  if (storage.session?.phase !== "playing") return null;
  const currentBread = storage.playerInventory?.[playerId]?.bread ?? 0;
  if (currentBread < 1) return null;

  const priorHunger = storage.playerHunger?.[playerId] ?? { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: 0 };
  reconcilePlayerHunger(priorHunger, now, true);

  return {
    playerInventory: {
      ...storage.playerInventory,
      [playerId]: { bread: currentBread - 1 },
    },
    playerHunger: {
      ...storage.playerHunger,
      [playerId]: { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: now },
    },
  };
}
