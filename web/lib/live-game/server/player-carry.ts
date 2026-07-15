import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGamePlayerCarry, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import {
  carryCapacityForPlayer,
  normalizePlayerCarry,
  readPlayerCarryBag,
} from "@/lib/live-game/carry-bag";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

/** @deprecated Prefer readPlayerCarryBag — returns normalized multi-slot bag. */
export function readPlayerCarry(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): LiveGamePlayerCarry | null {
  return readPlayerCarryBag(storage, playerId);
}

export function isPlayerCarrying(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): boolean {
  return readPlayerCarry(storage, playerId) != null;
}

export async function setPlayerCarry(
  roomId: string,
  playerId: string,
  carry: LiveGamePlayerCarry,
): Promise<boolean> {
  const liveblocks = getLiveblocksServerClient();
  let applied = false;

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session || session.get("phase") !== "playing") return;

    let playerCarry = storage.get("playerCarry");
    if (!playerCarry) {
      playerCarry = new LiveMap<string, LiveObject<LiveGamePlayerCarry>>() as unknown as LiveGameMutatorNode;
      storage.set("playerCarry", playerCarry);
    }
    playerCarry.set(playerId, new LiveObject(carry));
    applied = true;
  });

  return applied;
}

export async function clearPlayerCarry(roomId: string, playerId: string): Promise<void> {
  const liveblocks = getLiveblocksServerClient();
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const playerCarry = storage.get("playerCarry");
    if (!playerCarry) return;
    (playerCarry as { delete?: (key: string) => void }).delete?.(playerId);
  });
}

export function clearAllPlayerCarry(storage: { get: (key: string) => unknown }): void {
  const root = asLiveGameMutatorRoot(storage);
  const playerCarry = root.get("playerCarry");
  if (!playerCarry) {
    root.set("playerCarry", new LiveMap());
    return;
  }

  const keysFn = (playerCarry as { keys?: () => Iterable<string> }).keys;
  const playerIds = keysFn ? [...keysFn.call(playerCarry)] : [];
  for (const playerId of playerIds) {
    (playerCarry as { delete?: (key: string) => void }).delete?.(playerId);
  }
}

export function writePlayerCarryBagToMutator(
  storage: ReturnType<typeof asLiveGameMutatorRoot>,
  playerId: string,
  bag: LiveGamePlayerCarry | null,
): void {
  let playerCarry = storage.get("playerCarry");
  if (!playerCarry) {
    playerCarry = new LiveMap<string, LiveObject<LiveGamePlayerCarry>>() as unknown as LiveGameMutatorNode;
    storage.set("playerCarry", playerCarry);
  }
  if (!bag) {
    (playerCarry as { delete?: (key: string) => void }).delete?.(playerId);
    return;
  }
  playerCarry.set(playerId, new LiveObject(bag));
}

export function readPlayerCarryBagFromMutator(
  storage: ReturnType<typeof asLiveGameMutatorRoot>,
  playerId: string,
  snapshotCapacityHint?: number,
): LiveGamePlayerCarry | null {
  const playerCarry = storage.get("playerCarry");
  const raw = playerCarry?.get(playerId);
  const capacity =
    snapshotCapacityHint ??
    (() => {
      const inventory = storage.get("playerInventory")?.get(playerId) as
        | { get?: (key: string) => unknown }
        | undefined;
      return inventory?.get?.("backpack") === true ? 4 : 1;
    })();
  if (!raw) return null;
  const plain =
    typeof (raw as { toImmutable?: () => unknown }).toImmutable === "function" ?
      (raw as { toImmutable: () => unknown }).toImmutable()
    : Object.fromEntries(
        ["slots", "heldSlotIndex", "resourceType", "sourceNodeId", "questionId", "harvestedAt"].map(
          (key) => [key, (raw as LiveGameMutatorNode).get(key)],
        ),
      );
  return normalizePlayerCarry(plain, capacity);
}

export async function setPlayerHeldSlot(input: {
  roomId: string;
  playerId: string;
  heldSlotIndex: number;
}): Promise<LiveGamePlayerCarry | null> {
  const liveblocks = getLiveblocksServerClient();
  let result: LiveGamePlayerCarry | null = null;

  await liveblocks.mutateStorage(input.roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session || session.get("phase") !== "playing") return;

    const inventoryEntry = storage.get("playerInventory")?.get(input.playerId) as
      | LiveGameMutatorNode
      | undefined;
    const capacity = inventoryEntry?.get("backpack") === true ? 4 : 1;
    const bag = readPlayerCarryBagFromMutator(storage, input.playerId, capacity);
    if (!bag) return;
    if (input.heldSlotIndex < 0 || input.heldSlotIndex >= bag.slots.length) return;
    if (!bag.slots[input.heldSlotIndex]) return;

    const next = { ...bag, heldSlotIndex: input.heldSlotIndex };
    writePlayerCarryBagToMutator(storage, input.playerId, next);
    result = next;
  });

  return result;
}

export async function clearPlayerHeldCarry(roomId: string, playerId: string): Promise<boolean> {
  const liveblocks = getLiveblocksServerClient();
  let cleared = false;

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const storage = asLiveGameMutatorRoot(root as unknown as { get: (key: string) => unknown });
    const session = storage.get("session");
    if (!session || session.get("phase") !== "playing") return;

    const inventoryEntry = storage.get("playerInventory")?.get(playerId) as LiveGameMutatorNode | undefined;
    const capacity = inventoryEntry?.get("backpack") === true ? 4 : 1;
    const bag = readPlayerCarryBagFromMutator(storage, playerId, capacity);
    if (!bag) return;

    const slots = [...bag.slots];
    if (!slots[bag.heldSlotIndex]) return;
    slots[bag.heldSlotIndex] = null;
    const nextFilled = slots.findIndex((slot) => slot != null);
    writePlayerCarryBagToMutator(
      storage,
      playerId,
      nextFilled < 0 ? null : { slots, heldSlotIndex: nextFilled },
    );
    cleared = true;
  });

  return cleared;
}

export { carryCapacityForPlayer };
