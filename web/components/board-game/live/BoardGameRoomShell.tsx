"use client";

import {
  ClientSideSuspense,
  RoomProvider,
} from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import type { LiveblocksAuthRole } from "@/lib/board-game/liveblocks/auth-policy";
import { createLobbyInitialStorage } from "@/lib/board-game/liveblocks/initial-storage";

type Props = {
  roomId: string;
  sessionId: string;
  role: LiveblocksAuthRole;
  displayName: string;
  hostUserId: string;
  children: ReactNode;
};

function LobbyLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-xl font-bold text-kid-ink">
      Connecting to game room...
    </div>
  );
}

export function BoardGameRoomShell({
  roomId,
  sessionId,
  role,
  displayName,
  hostUserId,
  children,
}: Props) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        displayName,
        role,
      }}
      initialStorage={createLobbyInitialStorage(
        role === "host" ? hostUserId : "player-pending",
        sessionId,
      )}
    >
      <ClientSideSuspense fallback={<LobbyLoading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}
