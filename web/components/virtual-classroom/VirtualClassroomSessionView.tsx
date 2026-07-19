"use client";

import {
  useBroadcastEvent,
  useEventListener,
  useStorage,
} from "@liveblocks/react/suspense";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GlobalTimerBanner } from "@/components/virtual-classroom/GlobalTimerPanel";
import { StudentSessionChrome } from "@/components/virtual-classroom/StudentSessionChrome";
import { VirtualClassroomLiveProvider } from "@/components/virtual-classroom/VirtualClassroomLiveProvider";
import { VirtualClassroomRoomShell } from "@/components/virtual-classroom/VirtualClassroomRoomShell";
import { VirtualClassroomToolbar } from "@/components/virtual-classroom/VirtualClassroomToolbar";
import { CollabDiagnosticsPanel } from "@/components/collab-diagnostics/CollabDiagnosticsPanel";
import {
  collabDiagnosticExportEnabled,
  diagnosticFetch,
  exportCollabDiagnosticEvents,
} from "@/lib/collab-diagnostics/client";
import {
  clearVirtualClassroomContext,
  getVirtualClassroomContext,
} from "@/lib/virtual-classroom/client-context";
import {
  DocumentLaunchPanel,
  type DocumentLaunchPayload,
} from "@/components/document-activity/DocumentLaunchPanel";
import {
  WhiteboardLaunchPanel,
  type WhiteboardLaunchPayload,
} from "@/components/pilots/whiteboard/WhiteboardLaunchPanel";
import { setDocumentSessionContext } from "@/lib/document-activity/client-context";
import { setWhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";
import {
  countByStatus,
  createEmptyClassroomStatus,
  type ClassroomStatusState,
} from "@/lib/virtual-classroom/tools/status";

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
  const [launchOverlay, setLaunchOverlay] = useState<"whiteboard" | "document" | null>(
    null,
  );
  const broadcast = useBroadcastEvent();

  const status = useStorage((root) => readRuntimeField<string>(root, "status") ?? "active");
  const title = useStorage((root) => readRuntimeField<string>(root, "title") ?? "Virtual Classroom");
  const announcement = useStorage(
    (root) => readRuntimeField<string | null>(root, "announcement"),
  );
  const activeActivity = useStorage((root) =>
    readRuntimeField<{
      kind: "whiteboard" | "document" | null;
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

  const classroomStatus = useStorage((root) => {
    return (
      readLiveObjectField<ClassroomStatusState>(
        (root as { runtime?: unknown }).runtime,
        "classroomStatus",
      ) ?? createEmptyClassroomStatus()
    );
  });
  const statusCounts = countByStatus(classroomStatus);

  useEventListener(({ event }) => {
    const type = (event as { type?: string }).type;
    if (type === "SESSION_ENDED") {
      setEnded(true);
      clearVirtualClassroomContext();
    }
  });

  useEffect(() => {
    if (status === "ended") {
      setEnded(true);
      clearVirtualClassroomContext();
    }
  }, [status]);

  useEffect(() => {
    if (role !== "host" || ended || status === "ended") return;
    void fetch(`/api/virtual-classroom/${sessionId}/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SYNC_ROSTER" }),
    }).catch(() => undefined);
  }, [ended, role, sessionId, status]);

  useEffect(() => {
    if (!launchOverlay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLaunchOverlay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launchOverlay]);

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
      clearVirtualClassroomContext();
      setEnded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }, [broadcast, sessionId]);

  const leaveSession = useCallback(() => {
    if (!window.confirm("Leave this classroom? You can rejoin with the join code.")) {
      return;
    }
    clearVirtualClassroomContext();
    router.push("/virtual-classroom/join");
  }, [router]);

  const launchWhiteboard = useCallback(
    async (launch?: WhiteboardLaunchPayload) => {
      setBusy("whiteboard");
      setError(null);
      try {
        const res = await diagnosticFetch(
          `/api/virtual-classroom/${sessionId}/whiteboard`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              launch ?? {
                title: "Whiteboard activity",
                instructions: "Use the tools. Submit when you are done.",
                timerMinutes: 4,
                worksheetPresetId: null,
                mode: "individual",
              },
            ),
          },
          {
            phase: "launch",
            name: "vc.launch_whiteboard",
            detail: {
              activity: "classroom",
              sessionId,
              commandType: launch ? "LAUNCH_WHITEBOARD" : "REENTER_WHITEBOARD",
            },
          },
        );
        const payload = (await res.json()) as {
          error?: string;
          sessionId?: string;
          roomId?: string;
          userId?: string;
          displayName?: string;
          joinCode?: string;
          mode?: string;
        };
        if (!res.ok || !payload.sessionId || !payload.roomId || !payload.userId) {
          throw new Error(payload.error ?? "Could not start whiteboard.");
        }
        setWhiteboardSessionContext({
          sessionId: payload.sessionId,
          roomId: payload.roomId,
          role: "host",
          displayName: payload.displayName ?? displayName,
          color: "#0f172a",
          userId: payload.userId,
        });
        router.push(`/teacher/whiteboard/${payload.sessionId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      } finally {
        setBusy(null);
      }
    },
    [displayName, router, sessionId],
  );

  const enterWhiteboardAsStudent = useCallback(async () => {
    const code = activeActivity?.joinCode;
    if (!code) return;
    setBusy("enter-wb");
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
              ? { joinCode: code, displayName, userId }
              : { joinCode: code },
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
        throw new Error(payload.error ?? "Could not enter whiteboard.");
      }
      setWhiteboardSessionContext({
        sessionId: payload.sessionId,
        roomId: payload.roomId,
        role: "player",
        displayName: payload.displayName ?? displayName,
        color: "#0f766e",
        userId: payload.userId,
      });
      router.push(`/whiteboard/${payload.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }, [activeActivity?.joinCode, classId, displayName, router, userId]);

  const launchDocument = useCallback(
    async (launch?: DocumentLaunchPayload) => {
      setBusy("document");
      setError(null);
      try {
        const res = await fetch(`/api/virtual-classroom/${sessionId}/document`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            launch ?? {
              templateType: "paragraph",
              participationMode: "individual",
              groupSubmitPolicy: "any_member",
              timerMinutes: 5,
            },
          ),
        });
        const payload = (await res.json()) as {
          error?: string;
          roundId?: string;
          roomId?: string;
          userId?: string;
          displayName?: string;
          vcSessionId?: string;
          groupsAssigned?: number;
          reused?: boolean;
        };
        if (!res.ok || !payload.roundId || !payload.roomId || !payload.userId) {
          throw new Error(payload.error ?? "Could not start document.");
        }
        if (
          !payload.reused &&
          launch?.participationMode === "group" &&
          (payload.groupsAssigned ?? 0) === 0
        ) {
          setError(
            "Group document started — use Group maker → Send to document after you generate groups.",
          );
        }
        setDocumentSessionContext({
          roundId: payload.roundId,
          roomId: payload.roomId,
          vcSessionId: payload.vcSessionId ?? sessionId,
          role: "host",
          displayName: payload.displayName ?? displayName,
          color: "#0f172a",
          userId: payload.userId,
        });
        router.push(`/teacher/document/${payload.roundId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed.");
      } finally {
        setBusy(null);
      }
    },
    [displayName, router, sessionId],
  );

  const enterDocumentAsStudent = useCallback(async () => {
    const roundId = activeActivity?.roundId ?? activeActivity?.joinCode;
    if (!roundId) return;
    setBusy("enter-doc");
    setError(null);
    try {
      const res = await fetch(`/api/document/${roundId}/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, userId }),
      });
      const payload = (await res.json()) as {
        error?: string;
        roundId?: string;
        roomId?: string;
        vcSessionId?: string;
        userId?: string;
        displayName?: string;
        role?: "host" | "player";
      };
      if (!res.ok || !payload.roundId || !payload.roomId || !payload.userId) {
        throw new Error(payload.error ?? "Could not enter document.");
      }
      setDocumentSessionContext({
        roundId: payload.roundId,
        roomId: payload.roomId,
        vcSessionId: payload.vcSessionId ?? sessionId,
        role: payload.role ?? "player",
        displayName: payload.displayName ?? displayName,
        color: "#0f766e",
        userId: payload.userId,
      });
      router.push(`/document/${payload.roundId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }, [activeActivity?.joinCode, activeActivity?.roundId, displayName, router, sessionId, userId]);

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

  if (ended || status === "ended") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Session ended</h1>
        <p className="text-slate-600">This Virtual Classroom has been closed by the teacher.</p>
        <div className="flex flex-col items-stretch gap-2 sm:min-w-[240px]">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            onClick={() =>
              router.push(
                role === "host"
                  ? classId
                    ? `/teacher/classes/${classId}`
                    : "/teacher/virtual-classroom/host"
                  : "/virtual-classroom/join",
              )
            }
          >
            {role === "host" ? (classId ? "Back to class" : "Host again") : "Leave"}
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
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-50 to-teal-50">
      <header className="border-b border-slate-200 bg-white/95 px-4 py-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              Virtual Classroom
            </p>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">
              Join code{" "}
              <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-sm text-white">
                {joinCode}
              </span>{" "}
              · {displayName} ({role === "host" ? "Teacher" : "Student"})
            </p>
          </div>
          {role === "host" ? (
            <button
              type="button"
              disabled={busy === "end"}
              onClick={() => void endSession()}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "end" ? "Ending…" : "End session for all"}
            </button>
          ) : (
            <button
              type="button"
              onClick={leaveSession}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Leave classroom
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {role === "host" && (
          <VirtualClassroomToolbar
            sessionId={sessionId}
            members={memberEntries}
            userId={userId}
            busy={Boolean(busy)}
            hasWhiteboardActivity={activeActivity?.kind === "whiteboard"}
            hasDocumentActivity={activeActivity?.kind === "document"}
            onCommand={runToolCommand}
          />
        )}

        <main
          className={`min-w-0 flex-1 space-y-4 p-4 ${
            role === "host" ? "pb-24 md:pb-4" : ""
          }`}
        >
          {announcement && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <span className="font-bold">Announcement: </span>
              {announcement}
            </div>
          )}

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {role === "host" ? (
              <>
                <h2 className="text-lg font-semibold text-slate-900">Activities</h2>
                <p className="text-sm text-slate-600">
                  Pick an activity to configure and launch. Ending an activity does not end the
                  Virtual Classroom.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => setLaunchOverlay("whiteboard")}
                    className={`relative flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 text-center transition disabled:opacity-50 ${
                      activeActivity?.kind === "whiteboard"
                        ? "border-teal-600 bg-teal-50 text-teal-950"
                        : "border-teal-200 bg-teal-50/70 text-teal-900 hover:border-teal-400"
                    }`}
                  >
                    <span className="text-lg font-black leading-none">WB</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      Board
                    </span>
                    {activeActivity?.kind === "whiteboard" && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-teal-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Live
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => setLaunchOverlay("document")}
                    className={`relative flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 text-center transition disabled:opacity-50 ${
                      activeActivity?.kind === "document"
                        ? "border-sky-600 bg-sky-50 text-sky-950"
                        : "border-sky-200 bg-sky-50/70 text-sky-900 hover:border-sky-400"
                    }`}
                  >
                    <span className="text-lg font-black leading-none">Doc</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      Write
                    </span>
                    {activeActivity?.kind === "document" && (
                      <span className="absolute -right-1 -top-1 rounded-full bg-sky-700 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Live
                      </span>
                    )}
                  </button>
                </div>

                {launchOverlay && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
                    role="presentation"
                    onClick={() => setLaunchOverlay(null)}
                  >
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label={
                        launchOverlay === "whiteboard"
                          ? "Whiteboard activity setup"
                          : "Document activity setup"
                      }
                      className="max-h-[min(85dvh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Activity setup
                          </p>
                          <h3 className="text-lg font-bold text-slate-900">
                            {launchOverlay === "whiteboard" ? "Whiteboard" : "Document"}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLaunchOverlay(null)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Close
                        </button>
                      </div>

                      {launchOverlay === "whiteboard" &&
                        activeActivity?.kind === "whiteboard" &&
                        activeActivity.joinCode && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => {
                              setLaunchOverlay(null);
                              void launchWhiteboard();
                            }}
                            className="mb-3 w-full rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-900 disabled:opacity-50"
                          >
                            {busy === "whiteboard" ? "Opening…" : "Re-enter whiteboard"}
                          </button>
                        )}

                      {launchOverlay === "document" &&
                        activeActivity?.kind === "document" &&
                        (activeActivity.roundId || activeActivity.joinCode) && (
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => {
                              setLaunchOverlay(null);
                              void launchDocument();
                            }}
                            className="mb-3 w-full rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-bold text-sky-900 disabled:opacity-50"
                          >
                            {busy === "document" ? "Opening…" : "Re-enter document"}
                          </button>
                        )}

                      {launchOverlay === "whiteboard" ? (
                        <WhiteboardLaunchPanel
                          busy={busy === "whiteboard"}
                          onLaunch={(payload) => {
                            setLaunchOverlay(null);
                            void launchWhiteboard(payload);
                          }}
                        />
                      ) : (
                        <DocumentLaunchPanel
                          busy={busy === "document"}
                          onLaunch={(payload) => {
                            setLaunchOverlay(null);
                            void launchDocument(payload);
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-slate-900">Waiting for activity</h2>
                <p className="text-sm text-slate-600">
                  You are in the live classroom. When your teacher starts an activity, it will
                  appear here.
                </p>
                {activeActivity?.kind === "whiteboard" && activeActivity.joinCode && (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void enterWhiteboardAsStudent()}
                    className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy === "enter-wb" ? "Entering…" : "Enter whiteboard"}
                  </button>
                )}
                {activeActivity?.kind === "document" &&
                  (activeActivity.roundId || activeActivity.joinCode) && (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void enterDocumentAsStudent()}
                      className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {busy === "enter-doc" ? "Entering…" : "Enter document"}
                    </button>
                  )}
              </>
            )}
          </section>

          <GlobalTimerBanner role={role} />

          {currentPickIds.length > 0 && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-3 text-center">
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

          {role === "member" && (
            <StudentSessionChrome
              userId={userId}
              members={memberEntries}
              busy={Boolean(busy)}
              onCommand={runToolCommand}
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </main>

        <aside className="hidden w-64 shrink-0 border-l border-slate-200 bg-white p-4 lg:block">
          <h2 className="text-sm font-semibold text-slate-900">
            In session ({memberEntries.length})
          </h2>
          {role === "host" && (
            <p className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
              <span>Ready {statusCounts.ready}</span>
              <span>Help {statusCounts.help}</span>
              <span>Hand {statusCounts.hand}</span>
              <span>Done {statusCounts.finished}</span>
            </p>
          )}
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {memberEntries.map((m) => {
              const st = classroomStatus.byStudentId[m.id];
              return (
                <li key={m.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {m.name}
                    {st && st !== "none" ? (
                      <span className="ml-1 text-[10px] font-bold uppercase text-teal-700">
                        {st}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-slate-500">
                    {m.role === "host" ? "Teacher" : "Student"}
                    {m.id === userId ? " · you" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
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

  useEffect(() => {
    if (!bootstrapped || !ctx) return;
    void fetch(`/api/virtual-classroom/${ctx.sessionId}`)
      .then((r) => r.json())
      .then((payload: { status?: string }) => {
        if (payload.status === "ended") {
          clearVirtualClassroomContext();
          setCtx(null);
        }
      })
      .catch(() => undefined);
  }, [bootstrapped, ctx]);

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
      {ctx.role === "host" && <CollabDiagnosticsPanel activity="classroom" />}
    </VirtualClassroomLiveProvider>
  );
}
