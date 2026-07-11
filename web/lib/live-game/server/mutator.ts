/** Minimal mutator surface for live-game rooms (board-game uses a different Storage shape). */

export type LiveGameMutatorNode = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
};

export type LiveGameMutatorRoot = {
  get(key: string): LiveGameMutatorNode | undefined;
};

export function asLiveGameMutatorRoot(root: { get: (key: string) => unknown }): LiveGameMutatorRoot {
  return root as LiveGameMutatorRoot;
}

export function readMutatorNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function readMutatorString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
