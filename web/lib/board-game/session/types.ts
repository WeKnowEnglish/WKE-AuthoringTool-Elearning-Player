import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

export type BoardGameSessionStatus = "hydrating" | "ready";

export interface BoardGameSession {
  setup: GameSetup;
  runtime: GameRuntime | null;
  gameStarted: boolean;
  status: BoardGameSessionStatus;
  setSetup: (setup: GameSetup) => void;
  commitRuntime: (runtime: GameRuntime) => void;
  startGame: () => void;
  restartGame: () => void;
  backToSetup: () => void;
  clearSession: () => void;
}

export type LocalBoardGameSessionOptions = {
  defaultPlayerCount?: number;
};
