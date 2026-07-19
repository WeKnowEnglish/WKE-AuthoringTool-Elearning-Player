"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useEffect, useMemo, useState } from "react";
import {
  WORKSHEET_PRESETS,
  boardIdForScope,
  type WhiteboardAuthRole,
} from "@/lib/whiteboard/domain";
import { formatRemaining, remainingMs } from "@/lib/whiteboard/timer";
import { WhiteboardCanvas } from "@/components/pilots/whiteboard/WhiteboardCanvas";
import { WhiteboardReviewPanel } from "@/components/pilots/whiteboard/WhiteboardReviewPanel";
import { WhiteboardRewardListener } from "@/components/pilots/whiteboard/WhiteboardRewardListener";
import { useRouter } from "next/navigation";
import { getVirtualClassroomContext } from "@/lib/virtual-classroom/client-context";
import {
  getOrCreateWhiteboardUserId,
  setWhiteboardSessionContext,
} from "@/lib/whiteboard/liveblocks/identity";
import {
  readLiveObjectField,
  readStorageMapEntries,
  readStorageMapKeys,
  readStorageMapValue,
} from "@/lib/whiteboard/liveblocks/storage-read";
import {
  studentFacingState,
  teacherControlLabel,
  type ReviewTaskState,
} from "@/lib/whiteboard/review-task";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";

type Props = {
  sessionId: string;
  role: WhiteboardAuthRole;
  userId: string;
  displayName: string;
};

async function sendCommand(sessionId: string, command: Record<string, unknown>) {
  const response = await diagnosticFetch(
    `/api/whiteboard/${sessionId}/command`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    },
    {
      phase: "command",
      name: "whiteboard.command",
      detail: {
        activity: "whiteboard",
        sessionId,
        commandType: typeof command.type === "string" ? command.type : undefined,
      },
    },
  );
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(payload?.error ?? "Command failed.");
}

export function WhiteboardActivityShell({ sessionId, role, userId, displayName }: Props) {
  const phase = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") return runtime.get("phase") as string;
    return (root as unknown as { runtime?: { phase?: string } }).runtime?.phase ?? "WAITING";
  });

  const mode = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") return runtime.get("mode") as string;
    return (root as unknown as { runtime?: { mode?: string } }).runtime?.mode ?? "individual";
  });

  const prompt = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") {
      return runtime.get("prompt") as { title: string; instructions: string };
    }
    return (root as unknown as { runtime?: { prompt?: { title: string; instructions: string } } })
      .runtime?.prompt;
  });

  const timer = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") {
      return runtime.get("timer") as import("@/lib/whiteboard/domain").TimerState;
    }
    return (root as unknown as { runtime?: { timer?: import("@/lib/whiteboard/domain").TimerState } })
      .runtime?.timer;
  });

  const joinCode = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") return runtime.get("joinCode") as string;
    return (root as unknown as { runtime?: { joinCode?: string } }).runtime?.joinCode ?? sessionId;
  });

  /** Virtual Classroom session id (UUID) when launched from VC; null for pilot-only rounds. */
  const runtimeVcSessionId = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") {
      const value = runtime.get("sessionId");
      return typeof value === "string" && value.length > 0 ? value : null;
    }
    const plain = (root as unknown as { runtime?: { sessionId?: string | null } }).runtime
      ?.sessionId;
    return typeof plain === "string" && plain.length > 0 ? plain : null;
  });

  const displayBoardId = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") return runtime.get("displayBoardId") as string | null;
    return (root as unknown as { runtime?: { displayBoardId?: string | null } }).runtime?.displayBoardId ?? null;
  });

  const compareBoardIds = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: { get?: (k: string) => unknown } }).runtime;
    if (runtime && typeof runtime.get === "function") {
      return runtime.get("compareBoardIds") as [string, string] | null;
    }
    return (
      (root as unknown as { runtime?: { compareBoardIds?: [string, string] | null } }).runtime
        ?.compareBoardIds ?? null
    );
  });

  const reviewTask = useStorage((root) => {
    const runtime = (root as unknown as { runtime?: unknown }).runtime;
    const shared = readLiveObjectField<{ targetIds?: string[] }>(runtime, "review");
    if (shared?.targetIds?.length) {
      return { boardIds: shared.targetIds } as ReviewTaskState;
    }
    return readLiveObjectField<ReviewTaskState>(runtime, "reviewTask") ?? null;
  });

  const myBoardStatus = useStorage((root) => {
    const boards = (root as unknown as { boards?: unknown }).boards;
    const modeVal = readLiveObjectField<string>(
      (root as { runtime?: unknown }).runtime,
      "mode",
    );
    const participants = (root as unknown as { participants?: unknown }).participants;
    const me = readStorageMapValue(participants, userId);
    const groupId = readLiveObjectField<string | null>(me, "groupId") ?? null;
    const boardId =
      modeVal === "group" && groupId
        ? boardIdForScope({ type: "group", groupId })
        : boardIdForScope({ type: "student", studentId: userId });
    const board = readStorageMapValue(boards, boardId);
    return readLiveObjectField<string>(board, "status") ?? null;
  });

  const participantEntries = useStorage((root) => {
    const participants = (root as unknown as { participants?: unknown }).participants;
    const out: {
      id: string;
      name: string;
      role: string;
      groupId: string | null;
      ready: boolean;
      rewardCount: number;
    }[] = [];
    for (const [id, raw] of readStorageMapEntries(participants)) {
      out.push({
        id,
        name: (readLiveObjectField<string>(raw, "name") ?? id) as string,
        role: (readLiveObjectField<string>(raw, "role") ?? "player") as string,
        groupId: (readLiveObjectField<string | null>(raw, "groupId") ?? null) as string | null,
        ready: Boolean(readLiveObjectField(raw, "ready")),
        rewardCount: (readLiveObjectField<number>(raw, "rewardCount") ?? 0) as number,
      });
    }
    return out;
  });

  const boardIds = useStorage((root) => {
    const boards = (root as unknown as { boards?: unknown }).boards;
    return readStorageMapKeys(boards);
  });

  const activeGroupIds = useStorage((root) => {
    const groups = (root as unknown as { groups?: unknown }).groups;
    return readStorageMapKeys(groups);
  });

  const myGroupId = useMemo(() => {
    const me = participantEntries.find((p) => p.id === userId);
    return me?.groupId ?? null;
  }, [participantEntries, userId]);

  const studentBoardId = useMemo(() => {
    if (mode === "group" && myGroupId) {
      return boardIdForScope({ type: "group", groupId: myGroupId });
    }
    return boardIdForScope({ type: "student", studentId: userId });
  }, [mode, myGroupId, userId]);

  const [inspectBoardId, setInspectBoardId] = useState<string | null>(null);
  const [comparePick, setComparePick] = useState<string[]>([]);
  const [hintDraft, setHintDraft] = useState("");
  const [returnFeedback, setReturnFeedback] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rewardFlash, setRewardFlash] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  // Auto-collect when timer expires (teacher or any client with host cookie may succeed).
  useEffect(() => {
    if (role !== "host" || !timer) return;
    if (phase !== "OPEN" && phase !== "PAUSED") return;
    if (remainingMs(timer, nowMs) > 0) return;
    if (timer.status === "idle") return;
    void sendCommand(sessionId, { type: "COLLECT" }).catch(() => undefined);
  }, [role, timer, nowMs, phase, sessionId]);

  const vcSessionId =
    runtimeVcSessionId ?? getVirtualClassroomContext()?.sessionId ?? null;

  const backToClassroom = () => {
    if (!vcSessionId) return;
    router.push(
      role === "host"
        ? `/teacher/virtual-classroom/${vcSessionId}`
        : `/virtual-classroom/${vcSessionId}`,
    );
  };

  // Teacher Complete → ENDED; send host + students back to the classroom.
  useEffect(() => {
    if (phase !== "ENDED" || !vcSessionId) return;
    router.push(
      role === "host"
        ? `/teacher/virtual-classroom/${vcSessionId}`
        : `/virtual-classroom/${vcSessionId}`,
    );
  }, [phase, vcSessionId, role, router]);

  const run = async (label: string, command: Record<string, unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await sendCommand(sessionId, command);
      if (
        (command.type === "COMPLETE" || command.type === "END_ROUND") &&
        vcSessionId
      ) {
        backToClassroom();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const studentBoards = useMemo(() => {
    const ids = boardIds.filter(
      (id) => id.startsWith("board:student:") || id.startsWith("board:group:"),
    );
    const active = new Set(activeGroupIds);
    return ids.sort((a, b) => {
      const aOrphan = a.startsWith("board:group:") && !active.has(a.slice("board:group:".length));
      const bOrphan = b.startsWith("board:group:") && !active.has(b.slice("board:group:".length));
      return Number(aOrphan) - Number(bOrphan);
    });
  }, [activeGroupIds, boardIds]);

  // Drop Show/Compare selections that become orphaned after regroup.
  // Stabilize on joined ids — Liveblocks selectors return a new array each render.
  const activeGroupKey = activeGroupIds.join("\0");
  useEffect(() => {
    const active = new Set(activeGroupKey ? activeGroupKey.split("\0") : []);
    const isOrphan = (boardId: string) =>
      boardId.startsWith("board:group:") &&
      !active.has(boardId.slice("board:group:".length));

    setComparePick((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => !isOrphan(id));
      return next.length === prev.length ? prev : next;
    });
    setInspectBoardId((current) =>
      current && isOrphan(current) ? null : current,
    );
  }, [activeGroupKey]);

  const facingState = studentFacingState({
    phase,
    boardStatus: myBoardStatus,
    hasReviewPush: Boolean(reviewTask) || Boolean(displayBoardId) || Boolean(compareBoardIds),
  });

  const reviewPanel = (
    <WhiteboardReviewPanel
      sessionId={sessionId}
      role={role}
      userId={userId}
      busy={Boolean(busy)}
      onTeacherCommand={run}
    />
  );

  if (role === "host") {
    return (
      <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-100 to-teal-50">
        <WhiteboardRewardListener userId={userId} />
        <header className="border-b border-slate-200 bg-white/90 px-4 py-3">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Whiteboard activity · Teacher
              </p>
              <h1 className="text-xl font-bold text-slate-900">{prompt?.title ?? "Whiteboard"}</h1>
              <p className="text-sm text-slate-600">
                Code <span className="font-mono font-bold">{joinCode}</span> ·{" "}
                <span className="font-semibold">{facingState}</span>
                <span className="text-slate-400"> ({phase})</span> ·{" "}
                {timer ? formatRemaining(remainingMs(timer, nowMs)) : "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <HostBtn
                label="Open"
                busy={busy}
                onClick={() => void run("Open", { type: "OPEN" })}
              />
              <HostBtn
                label="Pause"
                busy={busy}
                onClick={() => void run("Pause", { type: "PAUSE" })}
              />
              <HostBtn
                label="Resume"
                busy={busy}
                onClick={() => void run("Resume", { type: "RESUME" })}
              />
              <HostBtn
                label="+30s"
                busy={busy}
                onClick={() => void run("+30s", { type: "ADD_TIME", milliseconds: 30_000 })}
              />
              <HostBtn
                label="Collect"
                busy={busy}
                onClick={() => void run("Collect", { type: "COLLECT" })}
              />
              <HostBtn
                label="Class review"
                busy={busy}
                onClick={() => void run("Class review", { type: "ENTER_REVIEW" })}
              />
              {(phase === "COLLECTED" || phase === "REVIEW") && (
                <HostBtn
                  label={teacherControlLabel("REVISE")}
                  busy={busy}
                  onClick={() => void run("Revise", { type: "REVISE" })}
                />
              )}
              <HostBtn
                label="Complete"
                busy={busy}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Complete this whiteboard round? Students return to the classroom.",
                    )
                  ) {
                    return;
                  }
                  void run("Complete", { type: "COMPLETE" });
                }}
              />
              {vcSessionId && (
                <button
                  type="button"
                  onClick={backToClassroom}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                >
                  Back to classroom
                </button>
              )}
              <HostBtn
                label="Duplicate"
                busy={busy}
                onClick={() => {
                  void (async () => {
                    setBusy("Duplicate");
                    setError(null);
                    try {
                      const dup = await fetch(`/api/whiteboard/${sessionId}/duplicate`, {
                        method: "POST",
                      });
                      const payload = (await dup.json()) as {
                        error?: string;
                        title?: string;
                        instructions?: string;
                        timerMinutes?: number;
                        backgroundUrl?: string | null;
                        backgroundAssetId?: string | null;
                        mode?: string;
                      };
                      if (!dup.ok) throw new Error(payload.error ?? "Duplicate failed");
                      const userIdLocal = getOrCreateWhiteboardUserId();
                      const hostRes = await fetch("/api/whiteboard/host", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: userIdLocal,
                          displayName,
                          title: payload.title,
                          instructions: payload.instructions,
                          timerMinutes: payload.timerMinutes,
                          backgroundUrl: payload.backgroundUrl,
                          backgroundAssetId: payload.backgroundAssetId,
                          mode: payload.mode ?? "individual",
                        }),
                      });
                      const hosted = (await hostRes.json()) as {
                        error?: string;
                        sessionId?: string;
                        roomId?: string;
                      };
                      if (!hostRes.ok || !hosted.sessionId || !hosted.roomId) {
                        throw new Error(hosted.error ?? "Could not create duplicate room");
                      }
                      setWhiteboardSessionContext({
                        sessionId: hosted.sessionId,
                        roomId: hosted.roomId,
                        role: "host",
                        displayName,
                        color: "#0f172a",
                        userId: userIdLocal,
                      });
                      router.push(`/pilots/whiteboard/${hosted.sessionId}`);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Duplicate failed");
                    } finally {
                      setBusy(null);
                    }
                  })();
                }}
              />
              <HostBtn
                label="Archive room"
                busy={busy}
                onClick={() => {
                  if (!window.confirm("Archive this round and delete live room data?")) return;
                  void (async () => {
                    setBusy("Archive room");
                    try {
                      const res = await fetch(`/api/whiteboard/${sessionId}/archive`, {
                        method: "POST",
                      });
                      const payload = (await res.json()) as { error?: string };
                      if (!res.ok) throw new Error(payload.error ?? "Archive failed");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Archive failed");
                    } finally {
                      setBusy(null);
                    }
                  })();
                }}
              />
            </div>
          </div>
          {error && <p className="mx-auto mt-2 max-w-7xl text-sm text-red-600">{error}</p>}
          {rewardFlash && (
            <p className="mx-auto mt-2 max-w-7xl text-sm font-semibold text-amber-700">{rewardFlash}</p>
          )}
        </header>

        {reviewPanel}

        <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-4 lg:grid-cols-[1fr_320px]">
          <section className="min-h-0">
            {inspectBoardId ? (
              <div className="flex h-[70vh] flex-col gap-2">
                <button
                  type="button"
                  className="self-start text-sm font-semibold text-teal-800 underline"
                  onClick={() => setInspectBoardId(null)}
                >
                  ← Back to grid
                </button>
                <WhiteboardCanvas
                  boardId={inspectBoardId}
                  mode="inspect"
                  sessionId={sessionId}
                  role={role}
                  userId={userId}
                  annotationMode
                />
                <div className="flex flex-wrap gap-2">
                  <HostBtn
                    label="Clear board"
                    busy={busy}
                    onClick={() =>
                      void run("Clear", { type: "CLEAR_BOARD", boardId: inspectBoardId })
                    }
                  />
                  <HostBtn
                    label="Show (anonymous)"
                    busy={busy}
                    onClick={() => {
                      const gid = inspectBoardId.startsWith("board:group:")
                        ? inspectBoardId.slice("board:group:".length)
                        : null;
                      if (gid && !activeGroupIds.includes(gid)) {
                        setError("Orphaned group boards cannot be shown.");
                        return;
                      }
                      void run("Show", {
                        type: "SHOW",
                        boardId: inspectBoardId,
                        anonymous: true,
                      });
                    }}
                  />
                  <a
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800"
                    href={`/api/whiteboard/${sessionId}/export?boardId=${encodeURIComponent(inspectBoardId)}&format=png`}
                  >
                    Export PNG
                  </a>
                  <a
                    className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800"
                    href={`/api/whiteboard/${sessionId}/export?boardId=${encodeURIComponent(inspectBoardId)}&format=svg`}
                  >
                    Export SVG
                  </a>
                </div>
                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-teal-200 bg-teal-50/60 p-3">
                  <label className="min-w-[220px] flex-1 text-xs font-semibold text-slate-700">
                    Return with feedback
                    <input
                      value={returnFeedback}
                      onChange={(e) => setReturnFeedback(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"
                      placeholder="What should they fix or try next?"
                    />
                  </label>
                  <HostBtn
                    label="Return"
                    busy={busy}
                    onClick={() => {
                      void run("Return", {
                        type: "RETURN_BOARD",
                        boardId: inspectBoardId,
                        feedback: returnFeedback.trim() || undefined,
                      }).then(() => setReturnFeedback(""));
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3">
                  <label className="min-w-[220px] flex-1 text-xs font-semibold text-slate-700">
                    Private hint
                    <input
                      value={hintDraft}
                      onChange={(e) => setHintDraft(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"
                      placeholder="Only this board can see this…"
                    />
                  </label>
                  <HostBtn
                    label="Send hint"
                    busy={busy}
                    onClick={() =>
                      void run("Hint", {
                        type: "SET_BOARD_HINT",
                        boardId: inspectBoardId,
                        message: hintDraft,
                      })
                    }
                  />
                  <HostBtn
                    label="Clear hint"
                    busy={busy}
                    onClick={() =>
                      void run("Clear hint", {
                        type: "CLEAR_BOARD_HINT",
                        boardId: inspectBoardId,
                      })
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {studentBoards.map((boardId) => {
                  const groupOwnerId = boardId.startsWith("board:group:")
                    ? boardId.slice("board:group:".length)
                    : null;
                  const orphaned =
                    Boolean(groupOwnerId) && !activeGroupIds.includes(groupOwnerId!);
                  return (
                    <TeacherBoardCard
                      key={boardId}
                      boardId={boardId}
                      participants={participantEntries}
                      hideNames={false}
                      orphaned={orphaned}
                      selectedForCompare={comparePick.includes(boardId)}
                      onToggleCompare={() => {
                        if (orphaned) return;
                        setComparePick((prev) => {
                          if (prev.includes(boardId)) return prev.filter((id) => id !== boardId);
                          if (prev.length >= 2) return [prev[1]!, boardId];
                          return [...prev, boardId];
                        });
                      }}
                      onOpen={() => setInspectBoardId(boardId)}
                      onDisplay={() => {
                        if (orphaned) return;
                        void run("Show", {
                          type: "SHOW",
                          boardId,
                          anonymous: true,
                        });
                      }}
                      sessionId={sessionId}
                      role={role}
                      userId={userId}
                    />
                  );
                })}
                {studentBoards.length === 0 && (
                  <p className="text-slate-600">Waiting for students to join…</p>
                )}
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold text-slate-900">Students</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {participantEntries
                .filter((p) => p.role !== "host")
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {p.name}
                      {p.ready ? (
                        <span className="ml-2 text-xs font-bold text-teal-700">Ready</span>
                      ) : null}
                      {p.rewardCount > 0 ? (
                        <span className="ml-2 text-xs text-amber-700">★{p.rewardCount}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-amber-800"
                      onClick={() => {
                        void run("Award", {
                          type: "AWARD_STUDENT",
                          studentId: p.id,
                          rewardType: "star",
                        }).then(() => {
                          setRewardFlash(`Star awarded to ${p.name}`);
                          window.setTimeout(() => setRewardFlash(null), 2000);
                        });
                      }}
                    >
                      Award
                    </button>
                  </li>
                ))}
            </ul>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <HostBtn
                label={
                  comparePick.length === 2
                    ? "Compare"
                    : `Pick 2 to compare (${comparePick.length}/2)`
                }
                busy={busy}
                onClick={() => {
                  if (comparePick.length !== 2) return;
                  void run("Compare", {
                    type: "COMPARE",
                    boardIds: [comparePick[0], comparePick[1]],
                    anonymous: true,
                  });
                }}
              />
              <p className="text-xs font-semibold text-slate-700">Worksheet background</p>
              <div className="flex flex-wrap gap-1">
                {WORKSHEET_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                    onClick={() =>
                      void run("Background", {
                        type: "SET_BACKGROUND",
                        assetId: preset.id,
                        url: preset.url,
                      })
                    }
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
                  onClick={() =>
                    void run("Background", {
                      type: "SET_BACKGROUND",
                      assetId: null,
                      url: null,
                    })
                  }
                >
                  None
                </button>
              </div>
              <HostBtn
                label="Lock all boards"
                busy={busy}
                onClick={() => void run("Lock", { type: "LOCK_BOARDS" })}
              />
              <HostBtn
                label="Auto-pair groups of 2"
                busy={busy}
                onClick={() => {
                  const students = participantEntries.filter((p) => p.role !== "host");
                  const groups: { id: string; name: string; memberIds: string[] }[] = [];
                  for (let i = 0; i < students.length; i += 2) {
                    const members = students.slice(i, i + 2).map((s) => s.id);
                    const id = `g${groups.length + 1}`;
                    groups.push({ id, name: `Group ${groups.length + 1}`, memberIds: members });
                  }
                  void run("Groups", { type: "ASSIGN_GROUPS", groups });
                }}
              />
              <HostBtn
                label="Policy: any member"
                busy={busy}
                onClick={() =>
                  void run("Policy", {
                    type: "SET_GROUP_SUBMIT_POLICY",
                    policy: "any_member",
                  })
                }
              />
              <HostBtn
                label="Policy: leader only"
                busy={busy}
                onClick={() =>
                  void run("Policy", {
                    type: "SET_GROUP_SUBMIT_POLICY",
                    policy: "leader_only",
                  })
                }
              />
              <HostBtn
                label="Policy: everyone ready"
                busy={busy}
                onClick={() =>
                  void run("Policy", {
                    type: "SET_GROUP_SUBMIT_POLICY",
                    policy: "everyone_ready",
                  })
                }
              />
              <HostBtn
                label="Save as template"
                busy={busy}
                onClick={() => {
                  void (async () => {
                    setBusy("Save as template");
                    try {
                      await fetch("/api/whiteboard/templates", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId,
                          template: {
                            title: prompt?.title ?? "Whiteboard",
                            instructions: prompt?.instructions ?? "",
                            mode: mode as "individual" | "group" | "teacher_demo",
                            timerMinutes: timer
                              ? Math.max(1, Math.round(timer.durationMs / 60000))
                              : 4,
                            background: { assetId: null, url: null, fit: "contain", opacity: 1 },
                            settings: {},
                            stampPackId: "default",
                          },
                        }),
                      });
                    } finally {
                      setBusy(null);
                    }
                  })();
                }}
              />
              <p className="text-xs text-slate-500">Signed in as {displayName}</p>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <WhiteboardRewardListener userId={userId} />
      {reviewPanel}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm">
          <div>
            <span className="font-semibold">{displayName}</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="font-semibold text-teal-800">{facingState}</span>
            {mode === "group" && myGroupId && (
              <>
                <span className="mx-2 text-slate-300">·</span>
                <span>Group {myGroupId}</span>
              </>
            )}
          </div>
          {vcSessionId && (
            <button
              type="button"
              onClick={backToClassroom}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              Back to classroom
            </button>
          )}
        </div>
        {!reviewTask && (
          <div className="min-h-0 flex-1">
            <WhiteboardCanvas
              boardId={studentBoardId}
              mode="edit"
              sessionId={sessionId}
              role={role}
              userId={userId}
            />
          </div>
        )}
        {reviewTask && (
          <p className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm text-slate-600">
            Complete the class review task above. Your board is paused until the teacher closes
            Show / Compare.
          </p>
        )}
      </div>
    </div>
  );
}

function HostBtn({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy: string | null;
}) {
  return (
    <button
      type="button"
      disabled={busy != null}
      onClick={onClick}
      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
    >
      {busy === label ? "…" : label}
    </button>
  );
}

function TeacherBoardCard({
  boardId,
  participants,
  orphaned,
  selectedForCompare,
  onToggleCompare,
  onOpen,
  onDisplay,
  sessionId,
  role,
  userId,
}: {
  boardId: string;
  participants: { id: string; name: string; ready?: boolean }[];
  hideNames: boolean;
  orphaned: boolean;
  selectedForCompare: boolean;
  onToggleCompare: () => void;
  onOpen: () => void;
  onDisplay: () => void;
  sessionId: string;
  role: WhiteboardAuthRole;
  userId: string;
}) {
  const status = useStorage((root) => {
    const boards = (root as unknown as { boards?: unknown }).boards;
    const board = readStorageMapValue(boards, boardId);
    if (!board) return "—";
    return (readLiveObjectField<string>(board, "status") ?? "—") as string;
  });

  const ownerId = useStorage((root) => {
    const boards = (root as unknown as { boards?: unknown }).boards;
    const board = readStorageMapValue(boards, boardId);
    if (!board) return "";
    return (readLiveObjectField<string>(board, "ownerId") ?? "") as string;
  });

  const owner = participants.find((p) => p.id === ownerId);
  const label =
    owner?.name ??
    (boardId.startsWith("board:group:") ? boardId.replace("board:group:", "Group ") : ownerId);

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
        orphaned
          ? "border-slate-200 opacity-70"
          : selectedForCompare
            ? "border-sky-500"
            : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <div>
          <p className="font-bold text-slate-900">
            {label}
            {orphaned ? " (orphaned)" : ""}
          </p>
          <p className="text-xs text-slate-500">
            {status}
            {owner?.ready ? " · Ready" : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={orphaned}
            className="text-xs font-semibold text-sky-800 disabled:opacity-40"
            onClick={onToggleCompare}
          >
            {selectedForCompare ? "Unpick" : "Compare"}
          </button>
          <button type="button" className="text-xs font-semibold text-teal-800" onClick={onOpen}>
            Open
          </button>
          <button
            type="button"
            disabled={orphaned}
            className="text-xs font-semibold text-slate-600 disabled:opacity-40"
            onClick={onDisplay}
          >
            Show
          </button>
        </div>
      </div>
      <div className="h-36 p-1">
        <WhiteboardCanvas
          boardId={boardId}
          mode="thumbnail"
          sessionId={sessionId}
          role={role}
          userId={userId}
          showPrompt={false}
        />
      </div>
    </article>
  );
}
