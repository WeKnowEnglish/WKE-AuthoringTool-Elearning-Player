"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { createWhiteboardInitialStorage } from "@/lib/whiteboard/liveblocks/initial-storage";
import { DEFAULT_WHITEBOARD_PRESENCE } from "@/lib/whiteboard/liveblocks/types";
import type { WhiteboardAuthRole } from "@/lib/whiteboard/domain";

type Props = {
  roomId: string;
  sessionId: string;
  role: WhiteboardAuthRole;
  displayName: string;
  hostUserId: string;
  clientInstanceId: string;
  children: ReactNode;
};

function RoomLoading() {
  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center bg-slate-100 text-lg font-semibold text-slate-700">
      Connecting to whiteboard…
    </div>
  );
}

export function WhiteboardRoomShell({
  roomId,
  sessionId,
  role,
  displayName,
  hostUserId,
  clientInstanceId,
  children,
}: Props) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={
        {
          ...DEFAULT_WHITEBOARD_PRESENCE,
          displayName,
          role,
          clientInstanceId,
        } as never
      }
      initialStorage={
        createWhiteboardInitialStorage({
          hostUserId: role === "host" ? hostUserId : "host-pending",
          joinCode: sessionId,
          roundId: `round_${sessionId}`,
        }) as never
      }
    >
      <ClientSideSuspense fallback={<RoomLoading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}
