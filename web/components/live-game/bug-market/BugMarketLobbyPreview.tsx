"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LiveGameHostLobbyPanel } from "@/components/live-game/LiveGameHostLobbyPanel";
import { KidButton } from "@/components/kid-ui/KidButton";
import { resolveLiveGameCharacter } from "@/lib/live-game/characters/live-game-characters";
import type { LiveGameLobbyPlayerEntry } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import type { EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";
import { BugMarketMapPreview } from "@/components/live-game/bug-market/BugMarketMapPreview";

const DEMO_PLAYERS: LiveGameLobbyPlayerEntry[] = [
  {
    id: "preview-teacher",
    player: {
      name: "Ms. Brady",
      color: "#64748b",
      role: "host",
      isReady: true,
      joinedAt: 1,
      avatarId: "girl-1",
    },
  },
  {
    id: "preview-student-1",
    player: {
      name: "Mia",
      color: "#38bdf8",
      role: "player",
      isReady: true,
      joinedAt: 2,
      avatarId: "girl-3",
    },
  },
  {
    id: "preview-student-2",
    player: {
      name: "Leo",
      color: "#f59e0b",
      role: "player",
      isReady: true,
      joinedAt: 3,
      avatarId: "boy-2",
    },
  },
  {
    id: "preview-student-3",
    player: {
      name: "An",
      color: "#a78bfa",
      role: "player",
      isReady: true,
      joinedAt: 4,
      avatarId: "boy-4",
    },
  },
];

export function BugMarketLobbyPreview() {
  const router = useRouter();
  const [durationMinutes, setDurationMinutes] = useState<EnglishCraftSessionDuration>(10);
  const [studentCount, setStudentCount] = useState(2);
  const [started, setStarted] = useState(false);

  const players = useMemo(
    () => [DEMO_PLAYERS[0], ...DEMO_PLAYERS.slice(1, studentCount + 1)],
    [studentCount],
  );

  if (started) {
    return <BugMarketMapPreview onReturnToLobby={() => setStarted(false)} />;
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#9bd56a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.45)_0_3%,transparent_4%),radial-gradient(circle_at_70%_32%,rgba(253,224,71,0.65)_0_2%,transparent_3%),linear-gradient(145deg,#d9f99d,#86efac_55%,#4ade80)]" />
      <div className="absolute inset-x-0 bottom-0 h-[32%] border-t-4 border-amber-800/30 bg-[linear-gradient(90deg,#d6a96f,#f1cf91,#d6a96f)]" />

      <div className="absolute left-5 top-16 z-40 flex flex-wrap items-center gap-2 md:right-[21rem]">
        <Link
          href="/live-game"
          className="rounded-xl border-2 border-white/60 bg-black/65 px-3 py-2 text-sm font-black shadow-lg backdrop-blur"
        >
          ← Exit preview
        </Link>
        <span className="rounded-xl border-2 border-amber-200 bg-amber-950/85 px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-100">
          Temporary lobby preview · no room created
        </span>
      </div>

      <section className="absolute inset-0 right-0 flex items-center justify-center pb-[18vh] md:right-80 md:pb-0">
        <div className="relative h-[70%] w-[86%] max-w-4xl rounded-[3rem] border-4 border-white/40 bg-white/10 shadow-inner backdrop-blur-[1px]">
          <div className="absolute inset-x-[8%] top-[8%] text-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-950/70">Shared meadow</p>
            <h1 className="mt-1 text-4xl font-black text-emerald-950 drop-shadow-sm">Bug Market</h1>
            <p className="mt-2 font-bold text-emerald-950/70">Walk around while your teacher prepares the game.</p>
          </div>

          <div className="absolute inset-x-[8%] bottom-[8%] grid grid-cols-2 gap-3 sm:grid-cols-4">
            {players.map(({ id, player }) => (
              <div key={id} className="flex flex-col items-center">
                <div className="relative h-28 w-24 sm:h-36 sm:w-28">
                  <Image
                    src={resolveLiveGameCharacter(player.avatarId).src}
                    alt=""
                    fill
                    className="object-contain object-bottom drop-shadow-xl"
                    sizes="112px"
                    unoptimized
                    priority
                  />
                </div>
                <span className="rounded-full border-2 border-white/70 bg-emerald-950/80 px-3 py-1 text-xs font-black shadow">
                  {player.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LiveGameHostLobbyPanel
        gameTitle="Bug Market"
        startLabel="Enter map preview"
        previewTopOffset
        joinCode="BUG123"
        durationMinutes={durationMinutes}
        onDurationChange={setDurationMinutes}
        players={players}
        selfId="preview-teacher"
        studentCount={studentCount}
        connectedCount={players.length}
        canStart={studentCount > 0}
        onStart={() => setStarted(true)}
        onChangeCharacter={() => undefined}
        changeCharacterDisabled
        onLeaveClick={() => router.push("/live-game")}
      />

      <div className="fixed bottom-3 left-3 z-40 hidden gap-2 md:flex">
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-10 text-sm"
          onClick={() => setStudentCount((count) => Math.max(0, count - 1))}
        >
          Remove demo student
        </KidButton>
        <KidButton
          type="button"
          variant="accent"
          className="!min-h-10 text-sm"
          onClick={() => setStudentCount((count) => Math.min(3, count + 1))}
        >
          Add demo student
        </KidButton>
      </div>

    </main>
  );
}
