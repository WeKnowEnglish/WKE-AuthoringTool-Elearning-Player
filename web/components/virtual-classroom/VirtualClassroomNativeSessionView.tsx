"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DailyVideoDock } from "@/components/virtual-classroom/daily/DailyVideoDock";
import { ClassroomDiagnosticsExportButton } from "@/components/virtual-classroom/ClassroomDiagnosticsExportButton";
import { GlobalTimerBannerContent } from "@/components/virtual-classroom/GlobalTimerPanel";
import { StudentSessionChromeContent } from "@/components/virtual-classroom/StudentSessionChrome";
import { useClassroomRealtimeShadowPresence } from "@/components/virtual-classroom/useClassroomRealtimeShadowPresence";
import { useLobbyPresence } from "@/components/virtual-classroom/useLobbyPresence";
import { VirtualClassroomLearnControlsContent } from "@/components/virtual-classroom/VirtualClassroomLearnControls";
import { VirtualClassroomLearnStage } from "@/components/virtual-classroom/VirtualClassroomLearnStage";
import { launchWhiteboardInLearn } from "@/components/virtual-classroom/VirtualClassroomWhiteboardEmbed";
import { resolveClassroomRuntimeViewState } from "@/lib/classroom-realtime/runtime-view-state";
import {
  diagnosticFetch,
  recordAppDiagnostic,
} from "@/lib/app-diagnostics/client";
import {
  clearLastRoll,
  configureRandomiser,
  createSeededDiceRandom,
  rollDice,
} from "@/lib/classroom-tools/dice";
import {
  addGlobalTime,
  pauseGlobalTimer,
  resetGlobalTimer,
  resumeGlobalTimer,
  setGlobalTimerMode,
  startGlobalTimer,
} from "@/lib/classroom-tools/timer";
import type {
  ClassroomRuntimePatch,
  ClassroomRuntimeSnapshot,
} from "@/lib/classroom-realtime/types";
import {
  clearVirtualClassroomContext,
  getVirtualClassroomContext,
} from "@/lib/virtual-classroom/client-context";
import { resolveVirtualClassroomExitHref } from "@/lib/virtual-classroom/exit-href";
import type {
  VirtualClassroomLearnActivity,
  VirtualClassroomLearnStage as LearnStageId,
  VirtualClassroomUiMode,
} from "@/lib/virtual-classroom/liveblocks/initial-storage";
import type { VirtualClassroomPresentation } from "@/lib/virtual-classroom/presentation";
import type { WhiteboardSessionContext } from "@/lib/whiteboard/liveblocks/identity";

type Props = {
  sessionId: string;
  role: "host" | "member";
  userId: string;
  displayName: string;
  classId: string;
  joinCode: string;
  initialSnapshot?: ClassroomRuntimeSnapshot | null;
};

type RuntimeViewState = ReturnType<typeof resolveClassroomRuntimeViewState>;

function mergeRuntimePatches(
  current: ClassroomRuntimePatch | null,
  next: ClassroomRuntimePatch | null,
): ClassroomRuntimePatch | null {
  if (!current) return next;
  if (!next) return current;
  return {
    ...current,
    ...next,
    ...(current.tools || next.tools
      ? { tools: { ...current.tools, ...next.tools } }
      : {}),
  };
}

function optimisticPatchForCommand(
  command: Record<string, unknown>,
  runtime: RuntimeViewState | null,
): ClassroomRuntimePatch | null {
  switch (command.type) {
    case "SET_UI_MODE":
      return { uiMode: command.mode === "meeting" ? "meeting" : "learn" };
    case "SET_LEARN_STAGE":
      return {
        learnStage:
          command.stage === "activity" || command.stage === "presentation"
            ? command.stage
            : "whiteboard",
      };
    case "SET_LEARN_ACTIVITY":
      return { learnActivity: command.activity as VirtualClassroomLearnActivity | null };
    case "SET_LEARN_PRESENTATION": {
      const presentation = command.presentation as VirtualClassroomPresentation | null;
      return {
        learnPresentation: presentation,
        ...(presentation ? { learnStage: "presentation" as const } : {}),
      };
    }
    case "SET_LEARN_STUDENT_PENS":
      return { learnStudentPensEnabled: command.enabled !== false };
    case "SET_ANNOUNCEMENT":
      return {
        announcement:
          typeof command.message === "string"
            ? command.message.trim().slice(0, 280) || null
            : null,
      };
    case "SET_TIMER_MODE":
      return runtime && (command.mode === "countdown" || command.mode === "stopwatch")
        ? { tools: { timer: setGlobalTimerMode(runtime.timer, command.mode) } }
        : null;
    case "START_TIMER":
      return runtime
        ? {
            tools: {
              timer: startGlobalTimer(
                runtime.timer,
                typeof command.requestedAt === "number" ? command.requestedAt : Date.now(),
                typeof command.durationMs === "number" ? command.durationMs : undefined,
              ),
            },
          }
        : null;
    case "PAUSE_TIMER":
      return runtime
        ? {
            tools: {
              timer: pauseGlobalTimer(
                runtime.timer,
                typeof command.requestedAt === "number" ? command.requestedAt : Date.now(),
              ),
            },
          }
        : null;
    case "RESUME_TIMER":
      return runtime
        ? {
            tools: {
              timer: resumeGlobalTimer(
                runtime.timer,
                typeof command.requestedAt === "number" ? command.requestedAt : Date.now(),
              ),
            },
          }
        : null;
    case "ADD_TIMER_MS":
      return runtime && typeof command.milliseconds === "number"
        ? { tools: { timer: addGlobalTime(runtime.timer, command.milliseconds) } }
        : null;
    case "RESET_TIMER":
      return runtime
        ? {
            tools: {
              timer: resetGlobalTimer(
                runtime.timer,
                typeof command.durationMs === "number" ? command.durationMs : undefined,
              ),
            },
          }
        : null;
    case "SET_TIMER_VISIBLE":
      return runtime
        ? {
            tools: {
              timer: {
                ...runtime.timer,
                visibleToStudents: command.visibleToStudents === true,
              },
            },
          }
        : null;
    case "CONFIGURE_DICE":
      return runtime
        ? { tools: { randomiser: configureRandomiser(runtime.randomiser, command) } }
        : null;
    case "ROLL_DICE":
      return runtime && typeof command.seed === "number"
        ? {
            tools: {
              randomiser: rollDice(runtime.randomiser, {
                random: createSeededDiceRandom(command.seed),
                nowMs: Date.now(),
              }),
            },
          }
        : null;
    case "CLEAR_DICE":
      return runtime
        ? { tools: { randomiser: clearLastRoll(runtime.randomiser) } }
        : null;
    default:
      return null;
  }
}

/**
 * Class-linked classroom shell backed by the durable Supabase snapshot,
 * Broadcast patches, and Presence. The collaborative whiteboard receives its
 * own isolated Liveblocks provider only while that surface is mounted.
 */
export function VirtualClassroomNativeSessionView(props: Props) {
  const { sessionId, role, userId, displayName, classId, initialSnapshot } = props;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [optimisticPatch, setOptimisticPatch] = useState<ClassroomRuntimePatch | null>(null);
  const rosterSyncAttempted = useRef(false);
  const realtime = useClassroomRealtimeShadowPresence({
    sessionId,
    classId,
    userId,
    displayName,
    role,
    initialSnapshot,
  });

  const runtime = realtime.runtimeSnapshot
    ? resolveClassroomRuntimeViewState({
        snapshot: realtime.runtimeSnapshot,
        patch: mergeRuntimePatches(realtime.runtimePatch, optimisticPatch),
      })
    : null;
  const members = realtime.participants.map((participant) => ({
    id: participant.userId,
    name: participant.displayName,
    role: participant.role === "teacher" ? "host" : "member",
  }));

  useLobbyPresence(sessionId, Boolean(runtime) && !ended && runtime?.status !== "ended");

  useEffect(() => {
    if (runtime?.status === "ended") setEnded(true);
  }, [runtime?.status]);

  useEffect(() => {
    setOptimisticPatch(null);
  }, [realtime.runtimePatch]);

  useEffect(() => {
    if (role !== "host" || ended || runtime?.status === "ended") return;
    if (rosterSyncAttempted.current) return;
    rosterSyncAttempted.current = true;
    void fetch(`/api/virtual-classroom/${sessionId}/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "SYNC_ROSTER" }),
    }).catch(() => undefined);
  }, [ended, role, runtime?.status, sessionId]);

  const runToolCommand = useCallback(async (command: Record<string, unknown>) => {
    const clickedAt = performance.now();
    const preparedCommand =
      command.type === "ROLL_DICE" && typeof command.seed !== "number"
        ? { ...command, seed: crypto.getRandomValues(new Uint32Array(1))[0] }
        : (command.type === "START_TIMER" ||
              command.type === "PAUSE_TIMER" ||
              command.type === "RESUME_TIMER") &&
            typeof command.requestedAt !== "number"
          ? { ...command, requestedAt: Date.now() }
          : command;
    const nextOptimisticPatch = optimisticPatchForCommand(preparedCommand, runtime);
    if (nextOptimisticPatch) {
      setOptimisticPatch((current) => mergeRuntimePatches(current, nextOptimisticPatch));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          recordAppDiagnostic(
            role === "host" ? "teacher" : "student",
            "virtual-classroom",
            "classroom_optimistic_paint",
            {
              sessionId,
              commandType:
                typeof preparedCommand.type === "string" ? preparedCommand.type : "unknown",
            },
            {
              kind: "span",
              durationMs: Math.max(0, performance.now() - clickedAt),
            },
          );
        });
      });
    }
    setBusy("tools");
    setError(null);
    try {
      const response = await diagnosticFetch(
        `/api/virtual-classroom/${sessionId}/tools`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preparedCommand),
        },
        {
          surface: role === "host" ? "teacher" : "student",
          phase: "virtual-classroom",
          name: "classroom_tool_command",
          detail: {
            sessionId,
            commandType:
              typeof preparedCommand.type === "string" ? preparedCommand.type : "unknown",
          },
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Tool command failed.");
    } catch (commandError) {
      if (nextOptimisticPatch) setOptimisticPatch(null);
      setError(commandError instanceof Error ? commandError.message : "Command failed.");
    } finally {
      setBusy(null);
    }
  }, [role, runtime, sessionId]);

  const exitHref = useCallback(() => {
    const context = getVirtualClassroomContext();
    return resolveVirtualClassroomExitHref({
      role,
      classId: classId || context?.classId || null,
      returnHref: context?.returnHref,
    });
  }, [classId, role]);

  const leaveSession = useCallback(() => {
    if (!window.confirm("Leave this classroom? You can rejoin from your class page.")) return;
    const href = exitHref();
    clearVirtualClassroomContext();
    router.push(href);
  }, [exitHref, router]);

  const endSession = useCallback(async () => {
    if (!window.confirm("End Virtual Classroom for everyone? Students will be disconnected.")) return;
    setBusy("end");
    setError(null);
    try {
      const response = await fetch(`/api/virtual-classroom/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "END_SESSION" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not end session.");
      setEnded(true);
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : "Could not end session.");
    } finally {
      setBusy(null);
    }
  }, [sessionId]);

  const launchWhiteboard = useCallback(async (background?: {
    url: string;
    assetId?: string | null;
    title?: string;
  }): Promise<WhiteboardSessionContext | null> => {
    setBusy("whiteboard");
    setError(null);
    try {
      const stageRequest = fetch(`/api/virtual-classroom/${sessionId}/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SET_LEARN_STAGE", stage: "whiteboard" }),
      }).catch(() => undefined);
      const next = await launchWhiteboardInLearn({ sessionId, displayName, background });
      await stageRequest;
      return next;
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Could not open whiteboard.");
      return null;
    } finally {
      setBusy(null);
    }
  }, [displayName, sessionId]);

  if (!runtime) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-slate-100 p-6 text-center">
        <p className="font-bold text-slate-900">
          {realtime.snapshot === "failed" ? "Could not restore the classroom" : "Connecting to classroom…"}
        </p>
        <p className="text-sm text-slate-600">
          {realtime.snapshot === "failed"
            ? "Refresh once. If the problem continues, turn off the native-shell pilot to use the compatibility classroom."
            : "Restoring the latest saved lesson state."}
        </p>
      </div>
    );
  }

  if (ended || runtime.status === "ended") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Session ended</h1>
        <p className="text-slate-600">This Virtual Classroom has been closed by the teacher.</p>
        {role === "host" ? <ClassroomDiagnosticsExportButton sessionId={sessionId} /> : null}
        <button
          type="button"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          onClick={() => {
            const href = exitHref();
            clearVirtualClassroomContext();
            router.push(href);
          }}
        >
          Back to class
        </button>
      </div>
    );
  }

  const setUiMode = (mode: VirtualClassroomUiMode) => void runToolCommand({ type: "SET_UI_MODE", mode });
  const setLearnStage = (stage: LearnStageId) => void runToolCommand({ type: "SET_LEARN_STAGE", stage });
  const setLearnActivity = (activity: VirtualClassroomLearnActivity | null) =>
    void runToolCommand({ type: "SET_LEARN_ACTIVITY", activity });
  const setLearnPresentation = (presentation: VirtualClassroomPresentation | null) =>
    void runToolCommand({ type: "SET_LEARN_PRESENTATION", presentation });
  const setLearnStudentPens = (enabled: boolean) =>
    void runToolCommand({ type: "SET_LEARN_STUDENT_PENS", enabled });
  const annotatePresentation = () => {
    if (runtime.learnPresentation?.kind !== "image") return;
    void launchWhiteboard({
      url: runtime.learnPresentation.url,
      assetId: runtime.learnPresentation.mediaAssetId ?? null,
      title: runtime.learnPresentation.title,
    });
  };
  const isMeeting = runtime.uiMode === "meeting";
  const whiteboardLive = runtime.activeActivity.kind === "whiteboard";
  const currentPickIds = runtime.picker.currentStudentIds;

  return (
    <div
      data-classroom-shell="supabase-native"
      className="flex h-dvh min-h-0 flex-row overflow-hidden bg-gradient-to-b from-slate-50 to-teal-50"
    >
      {error ? (
        <p className="fixed left-1/2 top-3 z-50 max-w-md -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 shadow-lg">
          {error}
        </p>
      ) : null}
      {busy === "tools" ? (
        <p
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-teal-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-teal-900 shadow-lg"
        >
          Updating classroom…
        </p>
      ) : null}

      <DailyVideoDock
        sessionId={sessionId}
        isHost={role === "host"}
        sessionEnded={false}
        layout={isMeeting ? "stage" : "dock"}
        onExitToLearn={role === "host" ? () => setUiMode("learn") : undefined}
        onEnterMeeting={role === "host" ? () => setUiMode("meeting") : undefined}
        onEndSession={role === "host" ? () => void endSession() : undefined}
        endSessionBusy={busy === "end"}
        onLeaveClassroom={role === "member" ? leaveSession : undefined}
      />

      {!isMeeting ? (
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 pb-24 sm:p-4">
            {runtime.announcement ? (
              <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <span className="font-bold">Announcement: </span>{runtime.announcement}
              </div>
            ) : null}

            <GlobalTimerBannerContent role={role} timer={runtime.timer} />

            {currentPickIds.length ? (
              <div className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-3 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Selected</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {currentPickIds.map((id) => members.find((member) => member.id === id)?.name ?? id.slice(0, 8)).join(" · ")}
                </p>
              </div>
            ) : null}

            <VirtualClassroomLearnStage
              sessionId={sessionId}
              classId={classId}
              role={role}
              userId={userId}
              displayName={displayName}
              busy={Boolean(busy)}
              learnStage={runtime.learnStage}
              learnActivity={runtime.learnActivity}
              learnPresentation={runtime.learnPresentation}
              whiteboardLive={whiteboardLive}
              whiteboardJoinCode={whiteboardLive ? runtime.activeActivity.joinCode : null}
              onSetStage={setLearnStage}
              onSetActivity={setLearnActivity}
              onSetPresentation={setLearnPresentation}
              onAnnotatePresentation={annotatePresentation}
              onLaunchWhiteboard={launchWhiteboard}
              studentPensEnabled={runtime.learnStudentPensEnabled}
              onToggleStudentPens={setLearnStudentPens}
              pensBusy={busy === "tools"}
              isolatedWhiteboardProvider
            />

            {role === "member" ? (
              <div className="shrink-0">
                <StudentSessionChromeContent
                  userId={userId}
                  members={members}
                  busy={Boolean(busy)}
                  onCommand={runToolCommand}
                  randomiser={runtime.randomiser}
                  points={runtime.points}
                  status={runtime.classroomStatus}
                />
              </div>
            ) : null}
          </main>

          <VirtualClassroomLearnControlsContent
            sessionId={sessionId}
            classId={classId}
            members={members}
            attendanceMembers={members}
            realtimeTimer={runtime.timer}
            realtimeRandomiser={runtime.randomiser}
            realtimePoints={runtime.points}
            realtimePicker={runtime.picker}
            realtimeGroupSet={runtime.groupSet}
            realtimeStatus={runtime.classroomStatus}
            userId={userId}
            role={role}
            busy={Boolean(busy)}
            hasWhiteboardActivity={whiteboardLive}
            hasDocumentActivity={runtime.activeActivity.kind === "document"}
            hasWordCardsActivity={runtime.activeActivity.kind === "word_cards"}
            whiteboardLive={whiteboardLive}
            onCommand={runToolCommand}
            onOpenPen={() => {
              if (role === "host") {
                setLearnStage("whiteboard");
                if (!whiteboardLive) void launchWhiteboard();
              }
            }}
            source="supabase"
            timer={runtime.timer}
            status={runtime.classroomStatus}
          />
        </div>
      ) : null}
    </div>
  );
}
