"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CollabDiagnosticsPanel } from "@/components/collab-diagnostics/CollabDiagnosticsPanel";
import { WhiteboardActivityShell } from "@/components/pilots/whiteboard/WhiteboardActivityShell";
import { WhiteboardLiveProvider } from "@/components/pilots/whiteboard/WhiteboardLiveProvider";
import { WhiteboardRoomShell } from "@/components/pilots/whiteboard/WhiteboardRoomShell";
import {
  getOrCreateWhiteboardUserId,
  getWhiteboardSessionContext,
  type WhiteboardSessionContext,
} from "@/lib/whiteboard/liveblocks/identity";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";

function createClientInstanceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `client-${Date.now()}`;
}

export function WhiteboardPilotSession() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = (params.sessionId ?? "").toUpperCase();

  // Do not read sessionStorage during the initial render — that mismatches SSR.
  const [bootstrapped, setBootstrapped] = useState(false);
  const [context, setContext] = useState<WhiteboardSessionContext | null>(null);
  const [clientInstanceId, setClientInstanceId] = useState<string | null>(null);

  useEffect(() => {
    const ctx = getWhiteboardSessionContext();
    if (!ctx || ctx.sessionId !== sessionId) {
      setContext(null);
    } else {
      setContext(ctx);
    }
    setClientInstanceId(createClientInstanceId());
    setBootstrapped(true);
  }, [sessionId]);

  if (!bootstrapped || !clientInstanceId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-700">
        Loading session…
      </div>
    );
  }

  if (!context) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
        <p className="text-lg font-bold text-slate-900">Join from the pilot home first.</p>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          onClick={() => router.push("/pilots/whiteboard")}
        >
          Back to whiteboard pilot
        </button>
      </div>
    );
  }

  const roomId = context.roomId || toWhiteboardRoomId(sessionId);
  const userId = context.userId || getOrCreateWhiteboardUserId();

  return (
    <WhiteboardLiveProvider>
      <WhiteboardRoomShell
        roomId={roomId}
        sessionId={sessionId}
        role={context.role}
        displayName={context.displayName}
        hostUserId={context.role === "host" ? userId : "host-pending"}
        clientInstanceId={clientInstanceId}
      >
        <WhiteboardActivityShell
          sessionId={sessionId}
          role={context.role}
          userId={userId}
          displayName={context.displayName}
        />
      </WhiteboardRoomShell>
      {context.role === "host" && <CollabDiagnosticsPanel activity="whiteboard" />}
    </WhiteboardLiveProvider>
  );
}
