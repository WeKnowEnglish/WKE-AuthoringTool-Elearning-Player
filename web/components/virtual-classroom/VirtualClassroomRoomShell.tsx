"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import type { ReactNode } from "react";
import { createVirtualClassroomInitialStorage } from "@/lib/virtual-classroom/liveblocks/initial-storage";

type Props = {
  roomId: string;
  sessionId: string;
  joinCode: string;
  classId: string;
  hostUserId: string;
  title: string;
  displayName: string;
  role: "host" | "member";
  children: ReactNode;
};

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-700">
      Connecting to Virtual Classroom…
    </div>
  );
}

export function VirtualClassroomRoomShell({
  roomId,
  sessionId,
  joinCode,
  classId,
  hostUserId,
  title,
  displayName,
  role,
  children,
}: Props) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={
        {
          displayName,
          role,
        } as never
      }
      initialStorage={
        createVirtualClassroomInitialStorage({
          sessionId,
          joinCode,
          classId,
          hostUserId,
          title,
        }) as never
      }
    >
      <ClientSideSuspense fallback={<Loading />}>{children}</ClientSideSuspense>
    </RoomProvider>
  );
}
