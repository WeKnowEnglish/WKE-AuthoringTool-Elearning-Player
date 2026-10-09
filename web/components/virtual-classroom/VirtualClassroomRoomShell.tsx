"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { useStatus } from "@liveblocks/react";
import { useEffect, type ReactNode } from "react";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";
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

export function ClassroomConnectionStatus({ sessionId, role }: Pick<Props, "sessionId" | "role">) {
  const status = useStatus();
  useEffect(() => {
    recordAppDiagnostic(role === "host" ? "teacher" : "student", "virtual-classroom", "classroom_collaboration_status", { sessionId, connectionStatus: status });
  }, [role, sessionId, status]);
  if (status !== "reconnecting" && status !== "disconnected") return null;
  return <p role="status" className="pointer-events-none fixed left-1/2 top-3 z-[60] max-w-md -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm text-amber-950 shadow">Reconnecting to classroom tools… Your video call stays open.</p>;
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
