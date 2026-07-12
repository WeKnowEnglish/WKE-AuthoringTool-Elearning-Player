import { LiveMap } from "@liveblocks/client";
import { asLiveGameMutatorRoot } from "@/lib/live-game/server/mutator";

function clearLiveMapKeys(mapNode: unknown): void {
  const keysFn = (mapNode as { keys?: () => Iterable<string> }).keys;
  const ids = keysFn ? [...keysFn.call(mapNode)] : [];
  for (const id of ids) {
    (mapNode as { delete?: (key: string) => void }).delete?.(id);
  }
}

export function clearAllPlayerInventory(storage: { get: (key: string) => unknown; set: (key: string, value: unknown) => void }): void {
  const root = asLiveGameMutatorRoot(storage);
  const playerInventory = root.get("playerInventory");
  if (!playerInventory) {
    root.set("playerInventory", new LiveMap());
    return;
  }
  clearLiveMapKeys(playerInventory);
}

export function clearAllPlayerHunger(storage: { get: (key: string) => unknown; set: (key: string, value: unknown) => void }): void {
  const root = asLiveGameMutatorRoot(storage);
  const playerHunger = root.get("playerHunger");
  if (!playerHunger) {
    root.set("playerHunger", new LiveMap());
    return;
  }
  clearLiveMapKeys(playerHunger);
}
