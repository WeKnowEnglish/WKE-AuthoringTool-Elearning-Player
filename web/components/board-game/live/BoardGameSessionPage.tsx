"use client";

import Link from "next/link";
import { BoardGameLiveProvider } from "@/components/board-game/live/BoardGameLiveProvider";
import { BoardGameRoomShell } from "@/components/board-game/live/BoardGameRoomShell";
import { BoardGameSessionRouter } from "@/components/board-game/live/BoardGameSessionRouter";
import { getLiveSessionContext } from "@/lib/board-game/liveblocks/identity";
import { isValidJoinCode } from "@/lib/board-game/liveblocks/join-code";
import { toRoomId } from "@/lib/board-game/liveblocks/room-id";

type Props = {
  sessionId: string;
};

export function BoardGameSessionPage({ sessionId }: Props) {
  const normalizedSessionId = sessionId.trim().toUpperCase();
  const context = getLiveSessionContext();

  if (!isValidJoinCode(normalizedSessionId)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-bold text-kid-ink">That join code is not valid.</p>
        <Link href="/board-game/multiplayer" className="mt-4 inline-block font-bold underline">
          Go back
        </Link>
      </div>
    );
  }

  if (!context || context.sessionId !== normalizedSessionId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-bold text-kid-ink">
          Join this room from the host or join screen first.
        </p>
        <Link
          href={`/board-game/multiplayer/join/${normalizedSessionId}`}
          className="mt-4 inline-block font-bold underline"
        >
          Join {normalizedSessionId}
        </Link>
      </div>
    );
  }

  return (
    <BoardGameLiveProvider>
      <BoardGameRoomShell
        roomId={toRoomId(normalizedSessionId)}
        sessionId={normalizedSessionId}
        role={context.role}
        displayName={context.displayName}
        hostUserId={context.userId}
      >
        <BoardGameSessionRouter context={{ ...context, sessionId: normalizedSessionId }} />
      </BoardGameRoomShell>
    </BoardGameLiveProvider>
  );
}
