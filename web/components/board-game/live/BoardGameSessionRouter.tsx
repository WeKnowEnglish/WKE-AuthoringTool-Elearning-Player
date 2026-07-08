"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { BoardGameLobby } from "@/components/board-game/live/BoardGameLobby";
import { BoardGameMultiplayerPlay } from "@/components/board-game/live/BoardGameMultiplayerPlay";
import type { LiveSessionContext } from "@/lib/board-game/liveblocks/identity";
import { gameSetupFromStorage } from "@/lib/board-game/liveblocks/serializers/setup";
import { gameRuntimeFromStorage } from "@/lib/board-game/liveblocks/serializers/runtime";

type Props = {
  context: LiveSessionContext;
};

function SessionLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-xl font-bold text-kid-ink">
      Loading game...
    </div>
  );
}

export function BoardGameSessionRouter({ context }: Props) {
  const phase = useStorage((root) => root.lobby.phase);
  const setup = useStorage((root) => gameSetupFromStorage(root.setup));
  const runtime = useStorage((root) => gameRuntimeFromStorage(root.runtime));

  if (phase === "playing" || phase === "finished") {
    if (!setup || !runtime) {
      return <SessionLoading />;
    }
    return (
      <BoardGameMultiplayerPlay
        context={context}
        setup={setup}
        runtime={runtime}
      />
    );
  }

  return <BoardGameLobby context={context} />;
}
