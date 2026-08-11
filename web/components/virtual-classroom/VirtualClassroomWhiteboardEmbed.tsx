"use client";

import { useCallback, useEffect, useState } from "react";
import { WhiteboardRoomShell } from "@/components/pilots/whiteboard/WhiteboardRoomShell";
import { VirtualClassroomSharedBoard } from "@/components/virtual-classroom/VirtualClassroomSharedBoard";
import { VirtualClassroomLiveProvider } from "@/components/virtual-classroom/VirtualClassroomLiveProvider";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { startAppDiagnosticSpan } from "@/lib/app-diagnostics/client";
import {
  getOrCreateWhiteboardUserId,
  getWhiteboardSessionContext,
  setWhiteboardSessionContext,
  type WhiteboardSessionContext,
} from "@/lib/whiteboard/liveblocks/identity";
import { toWhiteboardRoomId } from "@/lib/whiteboard/liveblocks/room-id";

type Props = {
  sessionId: string;
  role: "host" | "member";
  userId: string;
  displayName: string;
  classId: string;
  whiteboardLive: boolean;
  joinCode: string | null;
  busy: boolean;
  onLaunch: () => Promise<WhiteboardSessionContext | null>;
  studentPensEnabled: boolean;
  onToggleStudentPens: (enabled: boolean) => void;
  pensBusy?: boolean;
  /** Native Supabase shell supplies a provider only around the nested board. */
  isolatedLiveblocksProvider?: boolean;
};

function createClientInstanceId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `client-${Date.now()}`;
}

/**
 * Learn whiteboard: one shared class board (not the activity / breakout product).
 */
export function VirtualClassroomWhiteboardEmbed({
  sessionId,
  role,
  userId,
  displayName,
  classId,
  whiteboardLive,
  joinCode,
  busy,
  onLaunch,
  studentPensEnabled,
  onToggleStudentPens,
  pensBusy = false,
  isolatedLiveblocksProvider = false,
}: Props) {
  const [context, setContext] = useState<WhiteboardSessionContext | null>(null);
  const [clientInstanceId, setClientInstanceId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setClientInstanceId(createClientInstanceId());
    const existing = getWhiteboardSessionContext();
    if (existing && whiteboardLive) {
      setContext(existing);
    }
  }, [whiteboardLive]);

  const joinAsStudent = useCallback(async () => {
    if (!joinCode) return;
    setJoining(true);
    setError(null);
    try {
      const oneOff = !classId;
      const res = await fetch(
        oneOff ? "/api/whiteboard/join" : "/api/whiteboard/product-join",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            oneOff
              ? { joinCode, displayName, userId }
              : { joinCode },
          ),
        },
      );
      const payload = (await res.json()) as {
        error?: string;
        sessionId?: string;
        roomId?: string;
        userId?: string;
        displayName?: string;
      };
      if (!res.ok || !payload.sessionId || !payload.roomId || !payload.userId) {
        throw new Error(payload.error ?? "Could not join the class board.");
      }
      const next: WhiteboardSessionContext = {
        sessionId: payload.sessionId,
        roomId: payload.roomId,
        role: "player",
        displayName: payload.displayName ?? displayName,
        color: "#0f766e",
        userId: payload.userId,
      };
      setWhiteboardSessionContext(next);
      setContext(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the class board.");
    } finally {
      setJoining(false);
    }
  }, [classId, displayName, joinCode, userId]);

  useEffect(() => {
    if (role !== "member" || !whiteboardLive || !joinCode || context) return;
    void joinAsStudent();
  }, [context, joinAsStudent, joinCode, role, whiteboardLive]);

  const startBoard = useCallback(async () => {
    setError(null);
    const next = await onLaunch();
    if (next) setContext(next);
  }, [onLaunch]);

  if (context && clientInstanceId) {
    const roomId = context.roomId || toWhiteboardRoomId(context.sessionId);
    const wbUserId = context.userId || getOrCreateWhiteboardUserId();
    const board = (
      <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <WhiteboardRoomShell
          roomId={roomId}
          sessionId={context.sessionId}
          role={context.role}
          displayName={context.displayName}
          hostUserId={context.role === "host" ? wbUserId : "host-pending"}
          clientInstanceId={clientInstanceId}
        >
          <VirtualClassroomSharedBoard
            sessionId={context.sessionId}
            role={context.role}
            userId={wbUserId}
            studentPensEnabled={studentPensEnabled}
            onToggleStudentPens={role === "host" ? onToggleStudentPens : undefined}
            pensBusy={pensBusy}
          />
        </WhiteboardRoomShell>
      </div>
    );
    return isolatedLiveblocksProvider ? (
      <VirtualClassroomLiveProvider>{board}</VirtualClassroomLiveProvider>
    ) : board;
  }

  if (role === "host") {
    return (
      <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/40 px-4 text-center">
        <p className="text-base font-bold text-slate-900">Class board</p>
        <p className="max-w-sm text-sm text-slate-600">
          One shared space for the whole class to sketch and share ideas.
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void startBoard()}
          className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? "Opening…" : "Open class board"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold text-slate-800">
        {joining
          ? "Joining the class board…"
          : whiteboardLive
            ? "Connecting…"
            : "Waiting for the teacher to open the class board"}
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {whiteboardLive && joinCode && !joining ? (
        <button
          type="button"
          onClick={() => void joinAsStudent()}
          className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-bold text-white"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

/** Host opens (or reopens) the shared class board room without leaving Learn. */
export async function launchWhiteboardInLearn(input: {
  sessionId: string;
  displayName: string;
  background?: {
    url: string;
    assetId?: string | null;
    title?: string;
  };
}): Promise<WhiteboardSessionContext> {
  const finishJourney = startAppDiagnosticSpan(
    "teacher",
    "virtual-classroom",
    input.background ? "classroom_picture_add" : "classroom_board_launch",
    { sessionId: input.sessionId },
  );
  try {
  const res = await diagnosticFetch(
    `/api/virtual-classroom/${input.sessionId}/whiteboard`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: input.background?.title?.trim() || "Class board",
        instructions: input.background
          ? "Look closely and annotate the picture together."
          : "Draw and share ideas together.",
        timerMinutes: 60,
        worksheetPresetId: null,
        mode: "individual",
      }),
    },
    {
      phase: "launch",
      name: "vc.launch_class_board",
      detail: {
        activity: "classroom",
        sessionId: input.sessionId,
        commandType: "LAUNCH_CLASS_BOARD",
      },
    },
  );
  const payload = (await res.json()) as {
    error?: string;
    sessionId?: string;
    roomId?: string;
    userId?: string;
    displayName?: string;
  };
  if (!res.ok || !payload.sessionId || !payload.roomId || !payload.userId) {
    throw new Error(payload.error ?? "Could not open the class board.");
  }
  const next: WhiteboardSessionContext = {
    sessionId: payload.sessionId,
    roomId: payload.roomId,
    role: "host",
    displayName: payload.displayName ?? input.displayName,
    color: "#0f172a",
    userId: payload.userId,
  };
  setWhiteboardSessionContext(next);
  if (input.background) {
    const backgroundResponse = await diagnosticFetch(
      `/api/whiteboard/${encodeURIComponent(payload.sessionId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SET_BACKGROUND",
          assetId: input.background.assetId ?? null,
          url: input.background.url,
          fit: "contain",
          opacity: 1,
        }),
      },
      {
        phase: "launch",
        name: "vc.set_class_board_background",
        detail: {
          activity: "whiteboard",
          sessionId: input.sessionId,
          roomId: payload.roomId,
          commandType: "SET_BACKGROUND",
        },
      },
    );
    if (!backgroundResponse.ok) {
      const backgroundPayload = (await backgroundResponse.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        backgroundPayload?.error ?? "The board opened, but the picture could not be added.",
      );
    }
  }
  finishJourney({ hasBackground: Boolean(input.background) });
  return next;
  } catch (journeyError) {
    finishJourney(undefined, journeyError);
    throw journeyError;
  }
}
