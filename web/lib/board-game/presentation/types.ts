import type { GameRuntime } from "@/lib/board-game/types";

/** Authoritative write of game runtime state after an engine transition. */
export type CommitRuntime = (runtime: GameRuntime) => void;

export type BoardGameInteractMode = "host" | "spectator";

export type BoardGamePresentationConfig = {
  commitRuntime: CommitRuntime;
  interactMode?: BoardGameInteractMode;
};
