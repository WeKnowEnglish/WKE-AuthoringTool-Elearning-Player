"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { createWordCardsInitialStorage } from "@/lib/word-cards/liveblocks/initial-storage";
import { DEFAULT_WORD_CARDS_PRESENCE } from "@/lib/word-cards/liveblocks/types";
import type { WordCardsAuthRole } from "@/lib/word-cards/liveblocks/types";

type Props = {
  roomId: string;
  roundId: string;
  joinCode: string;
  vcSessionId: string;
  role: WordCardsAuthRole;
  displayName: string;
  hostUserId: string;
  clientInstanceId: string;
  children: ReactNode;
};

function RoomLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-lg font-semibold text-slate-700">
      Connecting to word cards…
    </div>
  );
}

export function WordCardsRoomShell({
  roomId,
  roundId,
  joinCode,
  vcSessionId,
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
          ...DEFAULT_WORD_CARDS_PRESENCE,
          displayName,
          role,
          clientInstanceId,
        } as never
      }
      initialStorage={
        createWordCardsInitialStorage({
          hostUserId: role === "host" ? hostUserId : "host-pending",
          roundId,
          joinCode,
          vcSessionId,
        }) as never
      }
    >
      <ClientSideSuspense fallback={<RoomLoading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}
