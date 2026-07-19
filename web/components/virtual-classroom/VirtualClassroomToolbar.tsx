"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { ClassroomStatusPanel } from "@/components/virtual-classroom/ClassroomStatusPanel";
import { DicePanel } from "@/components/virtual-classroom/DicePanel";
import { GlobalTimerPanel } from "@/components/virtual-classroom/GlobalTimerPanel";
import { GroupMakerPanel } from "@/components/virtual-classroom/GroupMakerPanel";
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

type Props = {
  sessionId: string;
  members: Member[];
  userId: string;
  busy: boolean;
  hasWhiteboardActivity: boolean;
  hasDocumentActivity: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
};

const TOOLS: { id: VcToolId; label: string; short: string }[] = [
  { id: "picker", label: "Student picker", short: "Pick" },
  { id: "groups", label: "Group maker", short: "Groups" },
  { id: "timer", label: "Timer", short: "Timer" },
  { id: "dice", label: "Dice", short: "Dice" },
  { id: "points", label: "Session points", short: "Points" },
  { id: "status", label: "Status & announce", short: "Status" },
];

const STORAGE_KEY = "wke-vc-open-tool";

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

export function VirtualClassroomToolbar({
  sessionId,
  members,
  userId,
  busy,
  hasWhiteboardActivity,
  hasDocumentActivity,
  onCommand,
}: Props) {
  const [openTool, setOpenTool] = useState<VcToolId | null>(null);
  const timer = useStorage((root) => readTimer(root));
  const status = useStorage((root) => readStatus(root));
  const helpCount = countByStatus(status).help + countByStatus(status).hand;
  const timerRunning = timer.status === "running";

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY) as VcToolId | null;
      if (saved && TOOLS.some((t) => t.id === saved)) {
        setOpenTool(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenTool(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = (id: VcToolId) => {
    setOpenTool((prev) => {
      const next = prev === id ? null : id;
      try {
        if (next) window.sessionStorage.setItem(STORAGE_KEY, next);
        else window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const badgeFor = (id: VcToolId): string | null => {
    if (id === "timer" && timerRunning) return "●";
    if (id === "status" && helpCount > 0) return String(helpCount);
    return null;
  };

  const panel = (() => {
    switch (openTool) {
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

  const openLabel = TOOLS.find((t) => t.id === openTool)?.label;

  return (
    <>
      {/* Desktop / tablet: left rail */}
      <aside className="relative z-20 hidden shrink-0 md:flex">
        <nav
          className="flex w-14 flex-col items-center gap-1 border-r border-slate-200 bg-white py-2 shadow-sm"
          aria-label="Global classroom tools"
        >
          <p className="mb-1 px-1 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Tools
          </p>
          {TOOLS.map((tool) => {
            const active = openTool === tool.id;
            const badge = badgeFor(tool.id);
            return (
              <button
                key={tool.id}
                type="button"
                title={tool.label}
                aria-pressed={active}
                aria-label={tool.label}
                onClick={() => toggle(tool.id)}
                className={`relative flex h-11 w-11 flex-col items-center justify-center rounded-lg text-[10px] font-bold leading-tight transition ${
                  active
                    ? "bg-teal-800 text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ToolGlyph id={tool.id} />
                <span className="mt-0.5 max-w-[2.75rem] truncate">{tool.short}</span>
                {badge && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {openTool && (
          <div className="flex w-[min(22rem,calc(100vw-4rem))] flex-col border-r border-slate-200 bg-slate-50 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
              <p className="text-sm font-bold text-slate-900">{openLabel}</p>
              <button
                type="button"
                className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                onClick={() => toggle(openTool)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[calc(100dvh-5.5rem)] flex-1 overflow-y-auto p-2 [&_section]:shadow-none">
              {panel}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile: bottom icon bar + sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden">
        <nav className="flex justify-around px-1 py-1" aria-label="Global classroom tools">
          {TOOLS.map((tool) => {
            const active = openTool === tool.id;
            const badge = badgeFor(tool.id);
            return (
              <button
                key={tool.id}
                type="button"
                aria-pressed={active}
                aria-label={tool.label}
                onClick={() => toggle(tool.id)}
                className={`relative flex flex-1 flex-col items-center rounded-md py-1.5 text-[10px] font-bold ${
                  active ? "bg-teal-800 text-white" : "text-slate-700"
                }`}
              >
                <ToolGlyph id={tool.id} />
                <span>{tool.short}</span>
                {badge && (
                  <span className="absolute right-1 top-0 rounded-full bg-amber-500 px-1 text-[9px] text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {openTool && (
          <div className="max-h-[55dvh] overflow-y-auto border-t border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">{openLabel}</p>
              <button
                type="button"
                className="text-xs font-semibold text-slate-600"
                onClick={() => toggle(openTool)}
              >
                Close
              </button>
            </div>
            {panel}
          </div>
        )}
      </div>
    </>
  );
}

function ToolGlyph({ id }: { id: VcToolId }) {
  const common = "text-sm font-black leading-none";
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
