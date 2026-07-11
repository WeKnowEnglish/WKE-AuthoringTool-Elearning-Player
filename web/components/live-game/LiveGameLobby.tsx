"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import type { LiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { useLiveGameLobby } from "@/lib/live-game/liveblocks/use-live-game-lobby";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";

type Props = {
  context: LiveGameSessionContext;
};

export function LiveGameLobby({ context }: Props) {
  const { session, players, others, selfEntry, isHost, joinLobby, setReady, startGame } =
    useLiveGameLobby();
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (joinedRef.current || selfEntry) return;
    joinedRef.current = true;
    joinLobby({
      name: context.displayName,
      color: context.color,
      role: context.role,
      avatarId: context.avatarId,
    });
  }, [
    context.avatarId,
    context.color,
    context.displayName,
    context.role,
    joinLobby,
    selfEntry,
  ]);

  const studentCount = players.filter((entry) => entry.player.role === "player").length;
  const canStart = isHost && studentCount >= 1;

  function handleStart() {
    setError(null);
    startGame();
  }

  const joinCode = session.joinCode;
  const durationMinutes = session.durationMinutes;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 py-8">
      <KidPanel className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-kid-ink">Live Game Lobby</h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/70">
              Mode: {ENGLISH_CRAFT_MODE.title} · {durationMinutes} min session
            </p>
            <p className="text-sm font-semibold text-kid-ink/70">
              {isHost ?
                "Share the join code with your students."
              : "Wait for your teacher to start the game."}
            </p>
          </div>
          <Link
            href="/live-game"
            className="text-sm font-bold text-kid-ink underline underline-offset-2"
          >
            Leave lobby
          </Link>
        </div>

        {isHost ?
          <div className="rounded-xl border-4 border-kid-ink bg-kid-surface px-4 py-3 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/60">
              Join code
            </p>
            <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.2em] text-kid-ink">
              {joinCode}
            </p>
          </div>
        : null}

        <p className="text-sm font-semibold text-kid-ink/80">
          {players.length} in room · {others.length + 1} connected now
        </p>

        <ul className="space-y-2">
          {players.map(({ id, player }) => (
            <li
              key={id}
              className="flex items-center justify-between rounded-xl border-2 border-kid-ink/20 bg-white/70 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-4 w-4 rounded-full border-2 border-kid-ink/40"
                  style={{ backgroundColor: player.color }}
                />
                <span className="font-bold text-kid-ink">
                  {player.name}
                  {player.role === "host" ? " (Teacher)" : ""}
                </span>
              </div>
              <span className="text-sm font-semibold text-kid-ink/70">
                {player.isReady ? "Ready" : "Not ready"}
              </span>
            </li>
          ))}
        </ul>

        {!isHost && selfEntry ?
          <KidButton
            variant={selfEntry.player.isReady ? "secondary" : "primary"}
            onClick={() => setReady(!selfEntry.player.isReady)}
          >
            {selfEntry.player.isReady ? "Not ready" : "I'm ready"}
          </KidButton>
        : null}

        {isHost ?
          <div className="space-y-2">
            <KidButton variant="primary" disabled={!canStart} onClick={handleStart}>
              Start English Craft
            </KidButton>
            {!canStart ?
              <p className="text-sm font-semibold text-kid-ink/70">
                Need at least 1 student in the lobby before starting (or test with two tabs).
              </p>
            : null}
          </div>
        : null}

        {error ?
          <p className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {error}
          </p>
        : null}
      </KidPanel>
    </div>
  );
}
