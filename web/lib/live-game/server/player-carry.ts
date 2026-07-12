import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGamePlayerCarry, LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import {
  asLiveGameMutatorRoot,
  type LiveGameMutatorNode,
} from "@/lib/live-game/server/mutator";

export function readPlayerCarry(
  storage: LiveGameStorageSnapshot | null | undefined,
  playerId: string,
): LiveGamePlayerCarry | null {
  return storage?.playerCarry?.[playerId] ?? null;
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
