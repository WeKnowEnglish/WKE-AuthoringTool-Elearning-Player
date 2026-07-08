"use client";

import { BoardGame } from "@/components/board-game/BoardGame";
import type { LiveSessionContext } from "@/lib/board-game/liveblocks/identity";
import { useLiveblocksBoardGameSession } from "@/lib/board-game/session/use-liveblocks-board-game-session";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

type Props = {
  context: LiveSessionContext;
  setup: GameSetup;
  runtime: GameRuntime;
};

export function BoardGameMultiplayerPlay({ context, setup, runtime }: Props) {
  const session = useLiveblocksBoardGameSession(context, setup);
  const interactMode = context.role === "host" ? "host" : "spectator";

  return (
    <BoardGame
      setup={setup}
      runtime={runtime}
      commitRuntime={session.commitRuntime}
      onBackToSetup={session.backToSetup}
      onRestart={session.restartGame}
      interactMode={interactMode}
    />
  );
}
