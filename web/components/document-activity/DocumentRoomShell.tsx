"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { createDocumentInitialStorage } from "@/lib/document-activity/liveblocks/initial-storage";
import { DEFAULT_DOCUMENT_PRESENCE } from "@/lib/document-activity/liveblocks/types";
import type { DocumentAuthRole } from "@/lib/document-activity/types";

type Props = {
  roomId: string;
  roundId: string;
  vcSessionId: string;
  role: DocumentAuthRole;
  displayName: string;
  hostUserId: string;
  clientInstanceId: string;
  children: ReactNode;
};

function RoomLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-lg font-semibold text-slate-700">
      Connecting to document…
    </div>
  );
}

export function DocumentRoomShell({
  roomId,
  roundId,
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
          ...DEFAULT_DOCUMENT_PRESENCE,
          displayName,
          role,
          clientInstanceId,
        } as never
      }
      initialStorage={
        createDocumentInitialStorage({
          hostUserId: role === "host" ? hostUserId : "host-pending",
          roundId,
          vcSessionId,
        }) as never
      }
    >
      <ClientSideSuspense fallback={<RoomLoading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}
