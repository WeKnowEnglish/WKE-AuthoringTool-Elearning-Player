"use client";

import {
  useBroadcastEvent,
  useEventListener,
  useStorage,
} from "@liveblocks/react/suspense";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DailyVideoDock } from "@/components/virtual-classroom/daily/DailyVideoDock";
import { GlobalTimerBanner } from "@/components/virtual-classroom/GlobalTimerPanel";
import { StudentSessionChrome } from "@/components/virtual-classroom/StudentSessionChrome";
import { useLobbyPresence } from "@/components/virtual-classroom/useLobbyPresence";
import { useClassroomRealtimeShadowPresence } from "@/components/virtual-classroom/useClassroomRealtimeShadowPresence";
import { VirtualClassroomLearnControls } from "@/components/virtual-classroom/VirtualClassroomLearnControls";
import { VirtualClassroomLearnStage } from "@/components/virtual-classroom/VirtualClassroomLearnStage";
import { VirtualClassroomLiveProvider } from "@/components/virtual-classroom/VirtualClassroomLiveProvider";
import { VirtualClassroomRoomShell } from "@/components/virtual-classroom/VirtualClassroomRoomShell";
import { launchWhiteboardInLearn } from "@/components/virtual-classroom/VirtualClassroomWhiteboardEmbed";
import {
  collabDiagnosticExportEnabled,
  exportCollabDiagnosticEvents,
} from "@/lib/collab-diagnostics/client";
import {
  clearVirtualClassroomContext,
  getVirtualClassroomContext,
} from "@/lib/virtual-classroom/client-context";
import { resolveVirtualClassroomExitHref } from "@/lib/virtual-classroom/exit-href";
import {
  normalizeVirtualClassroomLearnActivity,
  normalizeVirtualClassroomLearnStage,
  normalizeLearnStudentPensEnabled,
  normalizeVirtualClassroomUiMode,
  type VirtualClassroomLearnActivity,
  type VirtualClassroomLearnStage as LearnStageId,
  type VirtualClassroomUiMode,
} from "@/lib/virtual-classroom/liveblocks/initial-storage";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import type { WhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

type Props = {
  sessionId: string;
  role: "host" | "member";
  userId: string;
  displayName: string;
  classId: string;
  joinCode: string;
};

function readRuntimeField<T>(root: unknown, key: string): T | null {
  const runtime = (root as { runtime?: { get?: (k: string) => unknown } & Record<string, unknown> })
    .runtime;
  if (!runtime) return null;
  if (typeof runtime.get === "function") return (runtime.get(key) as T) ?? null;
  return ((runtime as Record<string, unknown>)[key] as T) ?? null;
}

export function VirtualClassroomSessionView({
  sessionId,
  role,
  userId,
  displayName,
  classId,
  joinCode,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const rosterSyncAttempted = useRef(false);
  const broadcast = useBroadcastEvent();

  const status = useStorage((root) => readRuntimeField<string>(root, "status") ?? "active");
  const uiMode = useStorage((root) =>
    normalizeVirtualClassroomUiMode(readRuntimeField<string>(root, "uiMode")),
  );
  const learnStage = useStorage((root) =>
    normalizeVirtualClassroomLearnStage(readRuntimeField(root, "learnStage")),
  );
  const learnActivity = useStorage((root) =>
    normalizeVirtualClassroomLearnActivity(readRuntimeField(root, "learnActivity")),
  );
  const learnStudentPensEnabled = useStorage((root) =>
    normalizeLearnStudentPensEnabled(readRuntimeField(root, "learnStudentPensEnabled")),
  );
  const announcement = useStorage(
    (root) => readRuntimeField<string | null>(root, "announcement"),
  );
  const activeActivity = useStorage((root) =>
    readRuntimeField<{
      kind: "whiteboard" | "document" | "word_cards" | null;
      joinCode: string | null;
      label: string | null;
      roundId?: string | null;
      roomId?: string | null;
    }>(root, "activeActivity"),
  );

  const memberEntries = useStorage((root) => {
    const members = (root as unknown as { members?: unknown }).members;
    if (!members || typeof members !== "object") return [] as { id: string; name: string; role: string }[];
    if (typeof (members as { entries?: unknown }).entries === "function") {
      const out: { id: string; name: string; role: string }[] = [];
      for (const [id, raw] of (members as { entries: () => IterableIterator<[string, unknown]> }).entries()) {
        const m = raw as { get?: (k: string) => unknown; name?: string; role?: string };
        out.push({
          id,
          name: typeof m.get === "function" ? (m.get("name") as string) : (m.name ?? id),
          role: typeof m.get === "function" ? (m.get("role") as string) : (m.role ?? "member"),
        });
      }
      return out;
    }
    return Object.entries(members as Record<string, { name?: string; role?: string }>).map(
      ([id, m]) => ({
        id,
        name: m.name ?? id,
        role: m.role ?? "member",
      }),
    );
  });

  const currentPickIds = useStorage((root) => {
    const picker = readLiveObjectField<{ currentStudentIds?: string[] }>(
      (root as { runtime?: unknown }).runtime,
      "picker",
    );
    return picker?.currentStudentIds ?? [];
  });

  const shadowHealth = useClassroomRealtimeShadowPresence({
    sessionId,
    classId,
    userId,
    displayName,
    role,
  });

  useLobbyPresence(sessionId, role === "host" && !ended && status !== "ended");

  useEventListener(({ event }) => {
    const type = (event as { type?: string }).type;
    if (type === "SESSION_ENDED") {
      setEnded(true);
    }
  });

  useEffect(() => {
    if (status === "ended") {
      setEnded(true);
    }
  }, [status]);

  useEffect(() => {
    if (role !== "host" || ended || status === "ended") return;
    if (rosterSyncAttempted.current) return;
    rosterSyncAttempted.current = true;
    void fetch(`/api/virtual-classroom/${sessionId}/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SYNC_ROSTER" }),
    }).catch(() => undefined);
  }, [ended, role, sessionId, status]);

  const endSession = useCallback(async () => {
    if (!window.confirm("End Virtual Classroom for everyone? Students will be disconnected.")) {
      return;
    }
    setBusy("end");
    setError(null);
    try {
      const res = await fetch(`/api/virtual-classroom/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "END_SESSION" }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Could not end session.");
      broadcast({ type: "SESSION_ENDED" } as never);
      // Keep client context until "Back to class" so returnHref + export mid-step work.
      setEnded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }, [broadcast, sessionId]);

  const exitHref = useCallback(() => {
    const ctx = getVirtualClassroomContext();
    return resolveVirtualClassroomExitHref({
      role,
      classId: classId || ctx?.classId || null,
      returnHref: ctx?.returnHref,
    });
  }, [role, classId]);

  const leaveSession = useCallback(() => {
    if (!window.confirm("Leave this classroom? You can rejoin from your class page.")) {
      return;
    }
    const href = exitHref();
    clearVirtualClassroomContext();
    router.push(href);
  }, [exitHref, router]);

  const launchWhiteboard = useCallback(async (): Promise<WhiteboardSessionContext | null> => {
    setBusy("whiteboard");
    setError(null);
    try {
      const next = await launchWhiteboardInLearn({
        sessionId,
        displayName,
      });
      await fetch(`/api/virtual-classroom/${sessionId}/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SET_LEARN_STAGE", stage: "whiteboard" }),
      }).catch(() => undefined);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
      return null;
    } finally {
      setBusy(null);
    }
  }, [displayName, sessionId]);

  const runToolCommand = useCallback(
    async (command: Record<string, unknown>) => {
      setBusy("tools");
      setError(null);
      try {
        const res = await fetch(`/api/virtual-classroom/${sessionId}/tools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(payload.error ?? "Tool command failed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      } finally {
        setBusy(null);
      }
    },
    [sessionId],
  );

  const setUiMode = useCallback(
    (mode: VirtualClassroomUiMode) => {
      void runToolCommand({ type: "SET_UI_MODE", mode });
    },
    [runToolCommand],
  );

  const setLearnStage = useCallback(
    (stage: LearnStageId) => {
      void runToolCommand({ type: "SET_LEARN_STAGE", stage });
    },
    [runToolCommand],
  );

  const setLearnActivity = useCallback(
    (activity: VirtualClassroomLearnActivity | null) => {
      void runToolCommand({ type: "SET_LEARN_ACTIVITY", activity });
    },
    [runToolCommand],
  );

  const setLearnStudentPens = useCallback(
    (enabled: boolean) => {
      void runToolCommand({ type: "SET_LEARN_STUDENT_PENS", enabled });
    },
    [runToolCommand],
  );

  const isMeeting = uiMode === "meeting";

  if (ended || status === "ended") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Session ended</h1>
        <p className="text-slate-600">This Virtual Classroom has been closed by the teacher.</p>
        <div className="flex flex-col items-stretch gap-2 sm:min-w-[240px]">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            onClick={() => {
              const href = exitHref();
              clearVirtualClassroomContext();
              router.push(href);
            }}
          >
            {role === "host"
              ? classId
                ? "Back to class"
                : "Back to host"
              : "Back to class"}
          </button>
          {role === "host" && collabDiagnosticExportEnabled() && (
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
              onClick={() => {
                const ok = exportCollabDiagnosticEvents(
                  `collab-diagnostics-${sessionId}`,
                );
                if (!ok) {
                  window.alert("No performance data recorded in this browser yet.");
                }
              }}
            >
              Export performance data
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-row overflow-hidden bg-gradient-to-b from-slate-50 to-teal-50">
      {error ? (
        <p className="pointer-events-auto fixed left-1/2 top-3 z-50 max-w-md -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 shadow-lg">
          {error}
        </p>
      ) : null}

      {shadowHealth.enabled ? (
        <div className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm">
          <p>Realtime pilot</p>
          <p className={shadowHealth.snapshot === "loaded" ? "text-emerald-700" : "text-rose-700"}>
            Snapshot: {shadowHealth.snapshot}{shadowHealth.snapshotVersion !== null ? ` (v${shadowHealth.snapshotVersion})` : ""}
          </p>
          <p className={shadowHealth.channel === "connected" ? "text-emerald-700" : shadowHealth.channel === "failed" ? "text-rose-700" : "text-amber-700"}>
            Private channel: {shadowHealth.channel}
          </p>
        </div>
      ) : null}

      <DailyVideoDock
        sessionId={sessionId}
        isHost={role === "host"}
        sessionEnded={ended || status === "ended"}
        layout={isMeeting ? "stage" : "dock"}
        onExitToLearn={
          role === "host" ? () => setUiMode("learn") : undefined
        }
        onEnterMeeting={
          role === "host" ? () => setUiMode("meeting") : undefined
        }
        onEndSession={role === "host" ? () => void endSession() : undefined}
        endSessionBusy={busy === "end"}
        onLeaveClassroom={role === "member" ? leaveSession : undefined}
      />

      {!isMeeting ? (
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 pb-24 sm:p-4">
          {announcement && (
            <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <span className="font-bold">Announcement: </span>
              {announcement}
            </div>
          )}

          <GlobalTimerBanner role={role} />

          {currentPickIds.length > 0 && (
            <div className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Selected
              </p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">
                {currentPickIds
                  .map((id) => memberEntries.find((m) => m.id === id)?.name ?? id.slice(0, 8))
                  .join(" · ")}
              </p>
            </div>
          )}

          <VirtualClassroomLearnStage
            sessionId={sessionId}
            classId={classId}
            role={role}
            userId={userId}
            displayName={displayName}
            busy={Boolean(busy)}
            learnStage={learnStage}
            learnActivity={learnActivity}
            whiteboardLive={activeActivity?.kind === "whiteboard"}
            whiteboardJoinCode={
              activeActivity?.kind === "whiteboard" ? activeActivity.joinCode : null
            }
            onSetStage={setLearnStage}
            onSetActivity={setLearnActivity}
            onLaunchWhiteboard={launchWhiteboard}
            studentPensEnabled={learnStudentPensEnabled}
            onToggleStudentPens={setLearnStudentPens}
            pensBusy={busy === "tools"}
          />

          {role === "member" && (
            <div className="shrink-0">
              <StudentSessionChrome
                userId={userId}
                members={memberEntries}
                busy={Boolean(busy)}
                onCommand={runToolCommand}
              />
            </div>
          )}
        </main>

        <VirtualClassroomLearnControls
          sessionId={sessionId}
          classId={classId}
          members={memberEntries}
          userId={userId}
          role={role}
          busy={Boolean(busy)}
          hasWhiteboardActivity={activeActivity?.kind === "whiteboard"}
          hasDocumentActivity={activeActivity?.kind === "document"}
          hasWordCardsActivity={activeActivity?.kind === "word_cards"}
          whiteboardLive={activeActivity?.kind === "whiteboard"}
          onCommand={runToolCommand}
          onOpenPen={() => {
            if (role === "host") {
              void runToolCommand({ type: "SET_LEARN_STAGE", stage: "whiteboard" });
              if (activeActivity?.kind !== "whiteboard") {
                void launchWhiteboard();
              }
            }
          }}
        />
      </div>
      ) : null}
    </div>
  );
}

/** Ensures context still matches before rendering Liveblocks room. */
export function VirtualClassroomSessionGate() {
  const router = useRouter();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [ctx, setCtx] = useState(() => null as ReturnType<typeof getVirtualClassroomContext>);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/virtual-classroom\/([^/]+)/i);
    const sessionIdFromPath = match?.[1] ? decodeURIComponent(match[1]) : "";
    const stored = getVirtualClassroomContext();
    if (!stored || stored.sessionId !== sessionIdFromPath) {
      setCtx(null);
    } else {
      setCtx(stored);
    }
    setBootstrapped(true);
  }, []);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-700">
        Loading session…
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
        <p className="text-lg font-bold text-slate-900">Join the Virtual Classroom first.</p>
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          onClick={() => router.push("/virtual-classroom/join")}
        >
          Go to join
        </button>
      </div>
    );
  }

  return (
    <VirtualClassroomLiveProvider>
      <VirtualClassroomRoomShell
        roomId={ctx.roomId}
        sessionId={ctx.sessionId}
        joinCode={ctx.joinCode}
        classId={ctx.classId}
        hostUserId={ctx.role === "host" ? ctx.userId : "host"}
        title="Virtual Classroom"
        displayName={ctx.displayName}
        role={ctx.role}
      >
        <VirtualClassroomSessionView
          sessionId={ctx.sessionId}
          role={ctx.role}
          userId={ctx.userId}
          displayName={ctx.displayName}
          classId={ctx.classId}
          joinCode={ctx.joinCode}
        />
      </VirtualClassroomRoomShell>
    </VirtualClassroomLiveProvider>
  );
}
