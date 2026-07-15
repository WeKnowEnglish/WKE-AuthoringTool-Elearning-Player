import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGamePlayerHunger, LiveGamePlayerInventory } from "@/lib/live-game/liveblocks/config";
import { isHoldingBread, removeHeldSlot } from "@/lib/live-game/carry-bag";
import { reconcilePlayerHunger } from "@/lib/live-game/modes/english-craft/hunger";
import { ENGLISH_CRAFT_HUNGER_MAX } from "@/lib/live-game/modes/english-craft/gameplay-v1";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  readPlayerCarryBagFromMutator,
  writePlayerCarryBagToMutator,
} from "@/lib/live-game/server/player-carry";
import {
  asLiveGameMutatorRoot,
  readMutatorNumber,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export type AwardConsumeBreadResult = {
  bread: number;
  hunger: number;
  fromCarry: boolean;
};

function restoreHunger(
  storage: ReturnType<typeof asLiveGameMutatorRoot>,
  playerId: string,
  now: number,
): number {
  let playerHunger = storage.get("playerHunger");
  if (!playerHunger) {
    playerHunger = new LiveMap() as unknown as LiveGameMutatorNode;
    storage.set("playerHunger", playerHunger);
  }

  let hungerEntry = playerHunger.get(playerId) as LiveGameMutatorNode | undefined;
  const priorHunger: LiveGamePlayerHunger = hungerEntry ?
    {
      value: readMutatorNumber(hungerEntry.get("value")),
      lastUpdatedAt:
        typeof hungerEntry.get("lastUpdatedAt") === "number" ?
          (hungerEntry.get("lastUpdatedAt") as number)
        : 0,
    }
  : { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: 0 };

  reconcilePlayerHunger(priorHunger, now, true);
  const restored: LiveGamePlayerHunger = {
    value: ENGLISH_CRAFT_HUNGER_MAX,
    lastUpdatedAt: now,
  };

  if (!hungerEntry) {
    hungerEntry = new LiveObject<LiveGamePlayerHunger>(restored) as unknown as LiveGameMutatorNode;
    playerHunger.set(playerId, hungerEntry);
  } else {
    hungerEntry.set("value", restored.value);
    hungerEntry.set("lastUpdatedAt", restored.lastUpdatedAt);
  }

  return restored.value;
}

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

    const inventoryMap = storage.get("playerInventory");
    const inventoryEntry = inventoryMap?.get(input.playerId) as LiveGameMutatorNode | undefined;
    const capacity = inventoryEntry?.get("backpack") === true ? 4 : 1;
    const bag = readPlayerCarryBagFromMutator(storage, input.playerId, capacity);

    if (isHoldingBread(bag) && bag) {
      writePlayerCarryBagToMutator(storage, input.playerId, removeHeldSlot(bag));
      const hunger = restoreHunger(storage, input.playerId, now);
      result = { bread: 0, hunger, fromCarry: true };
      return;
    }

    // Legacy: inventory bread count (older rooms / pre-carry-bread grants).
    if (!inventoryEntry) return;
    const currentBread = readMutatorNumber(inventoryEntry.get("bread"));
    if (currentBread < 1) return;

    const nextBread = currentBread - 1;
    inventoryEntry.set("bread", nextBread);
    const hunger = restoreHunger(storage, input.playerId, now);
    result = { bread: nextBread, hunger, fromCarry: false };
  });

  return result;
}

/** Test helper: simulate eating bread without Liveblocks. */
export function applyConsumeBreadToSnapshot(
  storage: {
    session?: { phase: string };
    playerInventory?: Record<string, LiveGamePlayerInventory>;
    playerHunger?: Record<string, LiveGamePlayerHunger>;
    playerCarry?: Record<string, unknown>;
  },
  playerId: string,
  now = Date.now(),
): {
  playerInventory: Record<string, LiveGamePlayerInventory>;
  playerHunger: Record<string, LiveGamePlayerHunger>;
  playerCarry?: Record<string, unknown>;
} | null {
  if (storage.session?.phase !== "playing") return null;

  const rawBag = storage.playerCarry?.[playerId] as
    | { slots?: Array<{ kind?: string } | null>; heldSlotIndex?: number }
    | undefined;
  if (
    rawBag &&
    typeof rawBag.heldSlotIndex === "number" &&
    rawBag.slots?.[rawBag.heldSlotIndex]?.kind === "bread"
  ) {
    const slots = [...(rawBag.slots ?? [])];
    slots[rawBag.heldSlotIndex] = null;
    const nextFilled = slots.findIndex((slot) => slot != null);
    const nextCarry =
      nextFilled < 0 ?
        undefined
      : {
          ...storage.playerCarry,
          [playerId]: { slots, heldSlotIndex: nextFilled },
        };
    return {
      playerInventory: storage.playerInventory ?? {},
      playerHunger: {
        ...storage.playerHunger,
        [playerId]: { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: now },
      },
      playerCarry: nextCarry,
    };
  }

  const currentBread = storage.playerInventory?.[playerId]?.bread ?? 0;
  if (currentBread < 1) return null;

  const priorHunger = storage.playerHunger?.[playerId] ?? { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: 0 };
  reconcilePlayerHunger(priorHunger, now, true);

  return {
    playerInventory: {
      ...storage.playerInventory,
      [playerId]: {
        bread: currentBread - 1,
        backpack: storage.playerInventory?.[playerId]?.backpack === true,
      },
    },
    playerHunger: {
      ...storage.playerHunger,
      [playerId]: { value: ENGLISH_CRAFT_HUNGER_MAX, lastUpdatedAt: now },
    },
    playerCarry: storage.playerCarry,
  };
}
