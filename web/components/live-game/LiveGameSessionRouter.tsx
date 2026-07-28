"use client";

import { useEffect } from "react";
import { useStatus, useStorage } from "@liveblocks/react/suspense";
import { LiveGameModeRenderer } from "@/components/live-game/LiveGameModeRenderer";
import { LiveGameLobbyCanvas } from "@/components/live-game/LiveGameLobbyCanvas";
import { BugMarketLobbyCanvas } from "@/components/live-game/bug-market/BugMarketLobbyCanvas";
import { LiveGameSessionEndedScreen } from "@/components/live-game/LiveGameSessionEndedScreen";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import type { LiveGameStorageSnapshot } from "@/lib/live-game/liveblocks/config";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import { preloadLiveGameQuestionBundle } from "@/lib/live-game/question-bundle-cache";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { recordLiveGameDiagnostic, startLiveGameDiagnosticSpan } from "@/lib/live-game/diagnostics/client";

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
  const modeId = useStorage((root) => (root as unknown as LiveGameStorageSnapshot).session.modeId);
  const connectionStatus = useStatus();
  const { isHost } = useLiveGameLobby();

  useEffect(() => {
    recordLiveGameDiagnostic("room", "liveblocks_storage_ready", { sessionId: context.sessionId });
    const finish = startLiveGameDiagnosticSpan("room", "question_bundle_preload", { sessionId: context.sessionId });
    void preloadLiveGameQuestionBundle(toRoomId(context.sessionId)).then(() => finish()).catch((error) => finish(undefined, error));
  }, [context.sessionId]);

  useEffect(() => {
    recordLiveGameDiagnostic(
      phase === "completed" || phase === "ended" ? "exit" : phase === "lobby" ? "lobby" : "gameplay",
      "session_phase_received",
      { phase, sessionId: context.sessionId },
    );
  }, [context.sessionId, phase]);

  useEffect(() => {
    recordLiveGameDiagnostic("system", "liveblocks_connection_status", {
      status: connectionStatus,
      sessionId: context.sessionId,
    });
  }, [connectionStatus, context.sessionId]);

  if (phase === "ended") {
    return <LiveGameSessionEndedScreen isHost={isHost} />;
  }

  if (phase === "playing" || phase === "paused" || phase === "completed") {
    return <LiveGameModeRenderer modeId={modeId} context={context} />;
  }

  if (phase === "lobby") {
    return modeId === "bug_market" ?
        <BugMarketLobbyCanvas context={context} />
      : <LiveGameLobbyCanvas context={context} />;
  }

  return <SessionLoading />;
}
