"use client";

import "@/liveblocks.config";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { DEFAULT_LIVE_GAME_PRESENCE } from "@/lib/live-game/liveblocks/config";
import type { LiveGameAuthRole } from "@/lib/live-game/liveblocks/auth-policy";
import { createLiveGameInitialStorage } from "@/lib/live-game/liveblocks/initial-storage";
import type { LiveGameModeId } from "@/lib/live-game/modes/types";

import type { EnglishCraftSessionDuration } from "@/lib/live-game/modes/english-craft/config";

type Props = {
  roomId: string;
  sessionId: string;
  role: LiveGameAuthRole;
  hostUserId: string;
  classId?: string | null;
  classTitle?: string | null;
  modeId: LiveGameModeId;
  mapId: string;
  durationMinutes: EnglishCraftSessionDuration;
  questionSetId: string;
  questionSetVersion: number;
  initialPresence?: Partial<typeof DEFAULT_LIVE_GAME_PRESENCE>;
  children: ReactNode;
};

function RoomLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-xl font-bold text-kid-ink">
      Connecting to live game...
    </div>
  );
}

export function LiveGameRoomShell({
  roomId,
  sessionId,
  role,
  hostUserId,
  classId,
  classTitle,
  modeId,
  mapId,
  durationMinutes,
  questionSetId,
  questionSetVersion,
  initialPresence,
  children,
}: Props) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        ...DEFAULT_LIVE_GAME_PRESENCE,
        ...initialPresence,
      } as never}
      initialStorage={createLiveGameInitialStorage({
        hostUserId: role === "host" ? hostUserId : "host-pending",
        classId,
        classTitle,
        joinCode: sessionId,
        modeId,
        mapId,
        durationMinutes,
        questionSetId,
        questionSetVersion,
      }) as never}
    >
      <ClientSideSuspense fallback={<RoomLoading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}
