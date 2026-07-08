"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyBackToSetup,
  applyClearSession,
  applyRestart,
  applyStartGame,
  createDefaultSessionState,
  hydrateFromStorage,
} from "@/lib/board-game/session/local-session-logic";
import type {
  BoardGameSession,
  BoardGameSessionStatus,
  LocalBoardGameSessionOptions,
} from "@/lib/board-game/session/types";
import {
  clearStoredRuntime,
  clearStoredSetup,
  writeStoredRuntime,
  writeStoredSetup,
} from "@/lib/board-game/storage";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

export function useLocalBoardGameSession(
  options?: LocalBoardGameSessionOptions,
): BoardGameSession {
  const defaultPlayerCount = options?.defaultPlayerCount ?? 3;
  const defaultState = createDefaultSessionState({ defaultPlayerCount });

  const [setup, setSetupState] = useState<GameSetup>(defaultState.setup);
  const [runtime, setRuntimeState] = useState<GameRuntime | null>(defaultState.runtime);
  const [gameStarted, setGameStarted] = useState(defaultState.gameStarted);
  const [status, setStatus] = useState<BoardGameSessionStatus>("hydrating");

  useEffect(() => {
    const hydrated = hydrateFromStorage();
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate game state from localStorage once on mount */
    setSetupState(hydrated.setup);
    if (hydrated.gameStarted && hydrated.runtime) {
      setRuntimeState(hydrated.runtime);
      setGameStarted(true);
    }
    setStatus("ready");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    writeStoredSetup(setup);
  }, [setup, status]);

  useEffect(() => {
    if (status !== "ready") return;
    writeStoredRuntime(gameStarted ? runtime : null);
  }, [runtime, gameStarted, status]);

  const setSetup = useCallback((nextSetup: GameSetup) => {
    setSetupState(nextSetup);
  }, []);

  const commitRuntime = useCallback((nextRuntime: GameRuntime) => {
    setRuntimeState(nextRuntime);
  }, []);

  const startGame = useCallback(() => {
    const next = applyStartGame(setup);
    setRuntimeState(next.runtime);
    setGameStarted(next.gameStarted);
  }, [setup]);

  const restartGame = useCallback(() => {
    const next = applyRestart(setup);
    setRuntimeState(next.runtime);
  }, [setup]);

  const backToSetup = useCallback(() => {
    const next = applyBackToSetup();
    setRuntimeState(next.runtime);
    setGameStarted(next.gameStarted);
    clearStoredRuntime();
  }, []);

  const clearSession = useCallback(() => {
    const next = applyClearSession(defaultPlayerCount);
    setSetupState(next.setup);
    setRuntimeState(next.runtime);
    setGameStarted(next.gameStarted);
    clearStoredSetup();
    clearStoredRuntime();
  }, [defaultPlayerCount]);

  return {
    setup,
    runtime,
    gameStarted,
    status,
    setSetup,
    commitRuntime,
    startGame,
    restartGame,
    backToSetup,
    clearSession,
  };
}
