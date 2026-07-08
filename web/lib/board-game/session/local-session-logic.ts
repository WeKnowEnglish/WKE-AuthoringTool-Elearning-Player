import { initRuntimeForSetup, restartGame } from "@/lib/board-game/game-engine";
import { createEmptySetup } from "@/lib/board-game/question-utils";
import { readStoredRuntime, readStoredSetup } from "@/lib/board-game/storage";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

export type SessionState = {
  setup: GameSetup;
  runtime: GameRuntime | null;
  gameStarted: boolean;
};

export type StorageReaders = {
  readSetup: () => GameSetup | null;
  readRuntime: () => GameRuntime | null;
};

export type HydratedSession = SessionState & {
  shouldEnterPlay: boolean;
};

export function createDefaultSessionState(options?: {
  defaultPlayerCount?: number;
}): SessionState {
  return {
    setup: createEmptySetup(options?.defaultPlayerCount ?? 3),
    runtime: null,
    gameStarted: false,
  };
}

export function hydrateFromStorage(
  readers: StorageReaders = {
    readSetup: readStoredSetup,
    readRuntime: readStoredRuntime,
  },
): HydratedSession {
  const defaultState = createDefaultSessionState();
  const storedSetup = readers.readSetup();
  const storedRuntime = readers.readRuntime();
  const gameStarted = Boolean(storedRuntime && storedSetup);

  return {
    setup: storedSetup ?? defaultState.setup,
    runtime: gameStarted ? storedRuntime : null,
    gameStarted,
    shouldEnterPlay: gameStarted,
  };
}

export function applyStartGame(setup: GameSetup): Pick<SessionState, "runtime" | "gameStarted"> {
  return {
    runtime: initRuntimeForSetup(setup),
    gameStarted: true,
  };
}

export function applyRestart(setup: GameSetup): Pick<SessionState, "runtime"> {
  return {
    runtime: restartGame(setup),
  };
}

export function applyBackToSetup(): Pick<SessionState, "runtime" | "gameStarted"> {
  return {
    runtime: null,
    gameStarted: false,
  };
}

export function applyClearSession(defaultPlayerCount = 3): SessionState {
  return createDefaultSessionState({ defaultPlayerCount });
}
