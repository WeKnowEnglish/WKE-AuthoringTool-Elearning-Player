"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LiveGameHostLobbyPanel } from "@/components/live-game/LiveGameHostLobbyPanel";
import { LiveGameHostLeaveModal } from "@/components/live-game/LiveGameHostLeaveModal";
import { LiveGameLobbyNoticeBanner } from "@/components/live-game/LiveGameLobbyNoticeBanner";
import { clearLiveGameSessionContext, type LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { useLiveGameSessionDuration } from "@/lib/live-game/hooks/useLiveGameSessionDuration";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import { canUseUnlimitedLiveGameDuration } from "@/lib/live-game/premium";
import { BUG_MARKET_MAP_V1_DOCUMENT } from "@/lib/live-game/modes/bug-market/map-v1";

export function BugMarketLobbyCanvas({ context }: { context: LiveGameSessionContext }) {
  const router = useRouter();
  const { self, players, session, isHost, others, startGame, closeLobby } = useLiveGameLobby();
  const { durationMinutes, setDurationMinutes } = useLiveGameSessionDuration(context);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const studentCount = players.filter((entry) => entry.player.role === "player").length;

  return (
    <main
      className="fixed inset-0 overflow-hidden text-white"
      style={{ backgroundColor: BUG_MARKET_MAP_V1_DOCUMENT.terrain.backgroundColor, backgroundImage: `url('${BUG_MARKET_MAP_V1_DOCUMENT.terrain.textureUrl}')`, backgroundPosition: "left top", backgroundRepeat: "repeat", backgroundSize: `${BUG_MARKET_MAP_V1_DOCUMENT.terrain.tileSizePx}px ${BUG_MARKET_MAP_V1_DOCUMENT.terrain.tileSizePx}px` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(220,252,231,.55),transparent_42%),linear-gradient(to_bottom,transparent,rgba(20,83,45,.45))]" />
      <LiveGameLobbyNoticeBanner notice={session.lobbyNotice} isHost={isHost} />
      <section className="absolute left-1/2 top-1/2 w-[min(90vw,38rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-4 border-white/70 bg-emerald-950/80 p-7 text-center shadow-2xl backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-200">Bug Market</p>
        <h1 className="mt-2 text-4xl font-black">The meadow is opening</h1>
        <p className="mx-auto mt-3 max-w-md text-base font-semibold text-white/80">
          Catch bugs for your display case. Later slices will add English questions, customers, and upgrades.
        </p>
        {!isHost ? <p className="mt-6 rounded-xl bg-white/10 px-4 py-3 font-bold">Waiting for your teacher to start…</p> : null}
      </section>

      {isHost ? <LiveGameHostLobbyPanel
        gameTitle="Bug Market"
        startLabel="Open Bug Market"
        joinCode={session.joinCode}
        durationMinutes={durationMinutes}
        onDurationChange={setDurationMinutes}
        canUseUnlimitedDuration={canUseUnlimitedLiveGameDuration(context.userId)}
        players={players}
        selfId={self.id}
        studentCount={studentCount}
        connectedCount={others.length + 1}
        canStart={studentCount >= 1}
        onStart={startGame}
        onChangeCharacter={() => {}}
        changeCharacterDisabled
        onLeaveClick={() => setLeaveModalOpen(true)}
      /> : null}

      <LiveGameHostLeaveModal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onLeaveOpen={() => router.push("/live-game")}
        onCloseLobby={() => {
          closeLobby();
          clearLiveGameSessionContext();
          router.push("/live-game");
        }}
      />
    </main>
  );
}
