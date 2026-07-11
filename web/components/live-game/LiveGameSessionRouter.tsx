"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { LiveGameCanvas } from "@/components/live-game/LiveGameCanvas";
import { LiveGameLobby } from "@/components/live-game/LiveGameLobby";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";

type Props = {
  context: LiveGameSessionContext;
};

function SessionLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-xl font-bold text-kid-ink">
      Loading live game...
    </div>
  );
}

export function LiveGameSessionRouter({ context }: Props) {
  const phase = useStorage((root) => (root as unknown as LiveGameStorageSnapshot).session.phase);

  if (phase === "playing" || phase === "paused" || phase === "completed") {
    return <LiveGameCanvas context={context} />;
  }

  if (phase === "lobby") {
    return <LiveGameLobby context={context} />;
  }

  return <SessionLoading />;
}
