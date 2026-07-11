"use client";

import Link from "next/link";
import { LiveGameRoomShell } from "@/components/live-game/LiveGameRoomShell";
import { LiveGameSessionRouter } from "@/components/live-game/LiveGameSessionRouter";
import { getLiveGameSessionContext } from "@/lib/live-game/liveblocks/identity";
import { isValidJoinCode } from "@/lib/live-game/liveblocks/join-code";
import { toRoomId } from "@/lib/live-game/liveblocks/room-id";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import { createMovementState } from "@/lib/live-game/engine/movement";
import { getMapForMode } from "@/lib/live-game/modes";

type Props = {
  sessionId: string;
};

export function LiveGameSessionPage({ sessionId }: Props) {
  const normalizedSessionId = sessionId.trim().toUpperCase();
  const context = getLiveGameSessionContext();

  if (!isValidJoinCode(normalizedSessionId)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-bold text-kid-ink">That join code is not valid.</p>
        <Link href="/live-game" className="mt-4 inline-block font-bold underline">
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
          href={`/live-game/join?code=${normalizedSessionId}`}
          className="mt-4 inline-block font-bold underline"
        >
          Join {normalizedSessionId}
        </Link>
      </div>
    );
  }

  const map = getMapForMode(context.mapId, context.modeId);
  const spawn = createMovementState(map, 0);

  return (
    <LiveGameRoomShell
        roomId={toRoomId(normalizedSessionId)}
        sessionId={normalizedSessionId}
        role={context.role}
        hostUserId={context.userId}
        modeId={context.modeId}
        mapId={context.mapId}
        durationMinutes={context.durationMinutes}
        initialPresence={{
          x: spawn.x,
          y: spawn.y,
          avatarId: context.avatarId,
        }}
      >
        <LiveGameSessionRouter context={{ ...context, sessionId: normalizedSessionId }} />
      </LiveGameRoomShell>
  );
}
