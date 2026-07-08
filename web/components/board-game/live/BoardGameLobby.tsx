"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  buildMultiplayerSetup,
  canStartMultiplayerGame,
} from "@/lib/board-game/liveblocks/build-multiplayer-setup";
import { useStartGameMutation } from "@/lib/board-game/liveblocks/mutations/game";
import { useJoinLobbyMutation, useSetReadyMutation } from "@/lib/board-game/liveblocks/mutations/lobby";
import { useBoardGameLobby } from "@/lib/board-game/liveblocks/use-board-game-lobby";
import type { LiveSessionContext } from "@/lib/board-game/liveblocks/identity";
import { readStoredSetup } from "@/lib/board-game/storage";

type Props = {
  context: LiveSessionContext;
};

export function BoardGameLobby({ context }: Props) {
  const {
    lobby,
    players,
    others,
    selfEntry,
    isHost,
  } = useBoardGameLobby();
  const joinLobby = useJoinLobbyMutation();
  const setReady = useSetReadyMutation();
  const startGame = useStartGameMutation();
  const [error, setError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (joinedRef.current || selfEntry) return;
    joinedRef.current = true;
    joinLobby({
      name: context.displayName,
      color: context.color,
      role: context.role,
    });
  }, [context.color, context.displayName, context.role, joinLobby, selfEntry]);

  const studentCount = players.filter((entry) => entry.player.role === "player").length;
  const canStart = isHost && studentCount >= 2;

  function handleStart() {
    setError(null);
    const setup = buildMultiplayerSetup({
      storedSetup: readStoredSetup(),
      lobbyPlayers: players,
    });

    if (!setup || !canStartMultiplayerGame(setup)) {
      setError(
        "Configure your map and questions on the board game setup screen, then make sure at least 2 students have joined.",
      );
      return;
    }

    startGame(setup);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 py-8">
      <KidPanel className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-kid-ink">Game Lobby</h1>
            <p className="mt-1 text-sm font-semibold text-kid-ink/70">
              {isHost ?
                "Share the join code with your students."
              : "Wait for your teacher to start the game."}
            </p>
          </div>
          <Link
            href="/board-game/multiplayer"
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
              {lobby.joinCode}
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
              Start game
            </KidButton>
            {!canStart ?
              <p className="text-sm font-semibold text-kid-ink/70">
                Need at least 2 students in the lobby before starting.
              </p>
            : null}
            <Link
              href="/board-game"
              className="inline-block text-sm font-bold text-kid-ink underline underline-offset-2"
            >
              Edit map and questions on setup screen
            </Link>
          </div>
        : null}

        {lobby.phase === "starting" ?
          <p className="rounded-lg border-2 border-kid-ink/20 bg-kid-surface-muted px-3 py-2 text-sm font-semibold text-kid-ink">
            Teacher is starting the game...
          </p>
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
