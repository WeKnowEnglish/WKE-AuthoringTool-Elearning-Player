"use client";

import { useCallback } from "react";
import { assertValidRuntimeCommit } from "@/lib/board-game/presentation/assert-valid-runtime-commit";
import type { LiveSessionContext } from "@/lib/board-game/liveblocks/identity";
import {
  useBackToLobbyMutation,
  useCommitRuntimeMutation,
  useRestartGameMutation,
} from "@/lib/board-game/liveblocks/mutations/game";
import type { BoardGameSession } from "@/lib/board-game/session/types";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

export function useLiveblocksBoardGameSession(
  context: LiveSessionContext,
  setup: GameSetup,
): BoardGameSession {
  const isHost = context.role === "host";
  const commitRuntimeMutation = useCommitRuntimeMutation();
  const restartGameMutation = useRestartGameMutation();
  const backToLobbyMutation = useBackToLobbyMutation();

  const commitRuntime = useCallback(
    (nextRuntime: GameRuntime) => {
      if (!isHost) return;
      if (process.env.NODE_ENV === "development") {
        assertValidRuntimeCommit(nextRuntime, setup);
      }
      commitRuntimeMutation(nextRuntime);
    },
    [commitRuntimeMutation, isHost, setup],
  );

  return {
    setup,
    runtime: null,
    gameStarted: true,
    status: "ready",
    setSetup: () => {},
    commitRuntime,
    startGame: () => {},
    restartGame: () => {
      if (isHost) restartGameMutation();
    },
    backToSetup: () => {
      if (isHost) backToLobbyMutation();
    },
    clearSession: () => {},
  };
}
