"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { ClassroomStatusPanel } from "@/components/virtual-classroom/ClassroomStatusPanel";
import { DicePanel } from "@/components/virtual-classroom/DicePanel";
import { GlobalTimerPanel } from "@/components/virtual-classroom/GlobalTimerPanel";
import { GroupMakerPanel } from "@/components/virtual-classroom/GroupMakerPanel";
import { SessionAttendancePanel } from "@/components/virtual-classroom/SessionAttendancePanel";
import { SessionPointsPanel } from "@/components/virtual-classroom/SessionPointsPanel";
import { StudentPickerPanel } from "@/components/virtual-classroom/StudentPickerPanel";
import {
  countByStatus,
  createEmptyClassroomStatus,
  type ClassroomStatusState,
} from "@/lib/virtual-classroom/tools/status";
import {
  createIdleGlobalTimer,
  type GlobalTimerState,
} from "@/lib/virtual-classroom/tools/timer";
import { readLiveObjectField } from "@/lib/whiteboard/liveblocks/storage-read";

export type VcToolId = "picker" | "groups" | "timer" | "dice" | "points" | "status";

type Member = { id: string; name: string; role: string };

type LearnPanel = "tools" | "attendance" | "chat" | "pen" | null;

type Props = {
  sessionId: string;
  classId: string;
  members: Member[];
  userId: string;
  role: "host" | "member";
  busy: boolean;
  hasWhiteboardActivity: boolean;
  hasDocumentActivity: boolean;
  hasWordCardsActivity: boolean;
  whiteboardLive: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
  onOpenPen: () => void;
};

const TOOLS: { id: VcToolId; label: string; short: string; blurb: string }[] = [
  { id: "picker", label: "Student picker", short: "Pick", blurb: "Choose who answers next" },
  { id: "groups", label: "Group maker", short: "Groups", blurb: "Split the class into groups" },
  { id: "timer", label: "Timer", short: "Timer", blurb: "Shared countdown for everyone" },
  { id: "dice", label: "Dice", short: "Dice", blurb: "Roll for games and turn-taking" },
  { id: "points", label: "Session points", short: "Points", blurb: "Award points this class" },
  { id: "status", label: "Status & announce", short: "Status", blurb: "Ready / help / announcements" },
];

function readTimer(root: unknown): GlobalTimerState {
  return (
    readLiveObjectField<GlobalTimerState>(
      (root as { runtime?: unknown }).runtime,
      "timer",
    ) ?? createIdleGlobalTimer()
  );
}

function readStatus(root: unknown): ClassroomStatusState {
  return (
    readLiveObjectField<ClassroomStatusState>(
      (root as { runtime?: unknown }).runtime,
      "classroomStatus",
    ) ?? createEmptyClassroomStatus()
  );
}

function ToolGlyph({ id }: { id: VcToolId }) {
  const common = "text-base font-black leading-none";
  switch (id) {
    case "picker":
      return <span className={common}>?</span>;
    case "groups":
      return <span className={common}>☰</span>;
    case "timer":
      return <span className={common}>◷</span>;
    case "dice":
      return <span className={common}>⚄</span>;
    case "points":
      return <span className={common}>★</span>;
    case "status":
      return <span className={common}>◎</span>;
    default:
      return null;
  }
}

/**
 * Learn-mode bottom controls: Tools · Attendance · Chat · Pen.
 * Teacher tools open from a compact overlay instead of a permanent left rail.
 */
export function VirtualClassroomLearnControls({
  sessionId,
  classId,
  members,
  userId,
  role,
  busy,
  hasWhiteboardActivity,
  hasDocumentActivity,
  hasWordCardsActivity,
  whiteboardLive,
  onCommand,
  onOpenPen,
}: Props) {
  const isHost = role === "host";
  const [panel, setPanel] = useState<LearnPanel>(null);
  const [activeTool, setActiveTool] = useState<VcToolId | null>(null);
  const timer = useStorage((root) => readTimer(root));
  const status = useStorage((root) => readStatus(root));
  const helpCount = countByStatus(status).help + countByStatus(status).hand;
  const timerRunning = timer.status === "running";
  const statusCounts = countByStatus(status);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTool(null);
        setPanel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeAll = () => {
    setActiveTool(null);
    setPanel(null);
  };

  const openPanel = (next: LearnPanel) => {
    setActiveTool(null);
    setPanel((prev) => (prev === next ? null : next));
  };

  const badgeFor = (id: VcToolId): string | null => {
    if (id === "timer" && timerRunning) return "●";
    if (id === "status" && helpCount > 0) return String(helpCount);
    return null;
  };

  const toolPanel = (() => {
    switch (activeTool) {
      case "picker":
        return (
          <StudentPickerPanel
            sessionId={sessionId}
            members={members}
            busy={busy}
            onCommand={onCommand}
          />
        );
      case "groups":
        return (
          <GroupMakerPanel
            sessionId={sessionId}
            members={members}
            busy={busy}
            hasWhiteboardActivity={hasWhiteboardActivity}
            hasDocumentActivity={hasDocumentActivity}
            hasWordCardsActivity={hasWordCardsActivity}
            onCommand={onCommand}
          />
        );
      case "timer":
        return <GlobalTimerPanel busy={busy} onCommand={onCommand} />;
      case "dice":
        return <DicePanel role="host" busy={busy} onCommand={onCommand} />;
      case "points":
        return (
          <SessionPointsPanel
            members={members}
            role="host"
            busy={busy}
            onCommand={onCommand}
          />
        );
      case "status":
        return (
          <ClassroomStatusPanel
            members={members}
            userId={userId}
            role="host"
            busy={busy}
            onCommand={onCommand}
          />
        );
      default:
        return null;
    }
  })();

  const activeToolLabel = TOOLS.find((t) => t.id === activeTool)?.label;

  return (
    <>
      {/* Bottom-center controls tab */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3">
        <nav
          className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur"
          aria-label="Classroom controls"
        >
          {isHost ? (
            <ControlButton
              label="Tools"
              active={panel === "tools" || Boolean(activeTool)}
              badge={helpCount > 0 ? String(helpCount) : timerRunning ? "●" : null}
              onClick={() => openPanel("tools")}
            />
          ) : null}
          <ControlButton
            label="Attendance"
            active={panel === "attendance"}
            onClick={() => openPanel("attendance")}
          />
          <ControlButton
            label="Chat"
            active={panel === "chat"}
            onClick={() => openPanel("chat")}
          />
          <ControlButton
            label="Pen"
            active={panel === "pen"}
            onClick={() => {
              if (whiteboardLive || isHost) {
                setPanel(null);
                setActiveTool(null);
                onOpenPen();
                return;
              }
              openPanel("pen");
            }}
          />
        </nav>
      </div>

      {/* Tools chooser overlay */}
      {isHost && panel === "tools" && !activeTool ? (
        <OverlayShell title="Teacher tools" onClose={closeAll}>
          <div className="grid gap-2 sm:grid-cols-2">
            {TOOLS.map((tool) => {
              const badge = badgeFor(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(tool.id);
                    setPanel(null);
                  }}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                    <ToolGlyph id={tool.id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{tool.label}</span>
                      {badge ? (
                        <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">{tool.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </OverlayShell>
      ) : null}

      {/* Active tool panel */}
      {isHost && activeTool ? (
        <OverlayShell
          title={activeToolLabel ?? "Tool"}
          onClose={closeAll}
          onBack={() => {
            setActiveTool(null);
            setPanel("tools");
          }}
        >
          <div className="[&_section]:shadow-none">{toolPanel}</div>
        </OverlayShell>
      ) : null}

      {/* Attendance */}
      {panel === "attendance" ? (
        <OverlayShell title="Attendance" onClose={closeAll}>
          {isHost ? (
            <SessionAttendancePanel
              sessionId={sessionId}
              classId={classId}
              liveMembers={members.filter((m) => m.role !== "host")}
            />
          ) : null}
          <div className={isHost ? "mt-4 border-t border-slate-200 pt-4" : undefined}>
            <h3 className="text-sm font-semibold text-slate-900">
              In session ({members.length})
            </h3>
            {isHost ? (
              <p className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                <span>Ready {statusCounts.ready}</span>
                <span>Help {statusCounts.help}</span>
                <span>Hand {statusCounts.hand}</span>
                <span>Done {statusCounts.finished}</span>
              </p>
            ) : null}
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {members.map((m) => {
                const st = status.byStudentId[m.id];
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
          </div>
        </OverlayShell>
      ) : null}

      {/* Chat placeholder */}
      {panel === "chat" ? (
        <OverlayShell title="Chat" onClose={closeAll}>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-800">Chat coming soon</p>
            <p className="mt-1 text-xs text-slate-500">
              Class chat will live here so everyone can message without leaving Learn.
            </p>
          </div>
        </OverlayShell>
      ) : null}

      {/* Pen hint when no whiteboard yet — host opens launch from parent */}
      {panel === "pen" && !whiteboardLive ? (
        <OverlayShell title="Pen / whiteboard" onClose={closeAll}>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Open the whiteboard</p>
            <p className="mt-1 text-xs text-slate-500">
              Use Pen to launch or re-enter the class whiteboard for drawing together.
            </p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
              onClick={() => {
                closeAll();
                onOpenPen();
              }}
            >
              {isHost ? "Open whiteboard" : "Enter when live"}
            </button>
          </div>
        </OverlayShell>
      ) : null}
    </>
  );
}

function ControlButton({
  label,
  active,
  badge,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`relative min-w-[4.5rem] rounded-xl px-3 py-2 text-xs font-bold transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {label}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function OverlayShell({
  title,
  onClose,
  onBack,
  children,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-3 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[min(85dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {onBack ? (
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                onClick={onBack}
              >
                ← Tools
              </button>
            ) : null}
            <p className="truncate text-sm font-bold text-slate-900">{title}</p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}
