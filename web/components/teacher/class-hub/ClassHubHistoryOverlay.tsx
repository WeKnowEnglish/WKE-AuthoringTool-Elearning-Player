"use client";

import { useEffect } from "react";
import { LiveGameClassProjectPanel } from "@/components/teacher/LiveGameClassProjectPanel";
import { VirtualClassroomSessionHistory } from "@/components/teacher/VirtualClassroomSessionHistory";
import type { VirtualClassroomSessionHistoryItem } from "@/lib/virtual-classroom/session-history-types";
import { WhiteboardClassHistory } from "@/components/teacher/WhiteboardClassHistory";
import type { LiveGameClassProjectOverview } from "@/lib/data/live-game-class-projects";
import type { WhiteboardRoundHistoryItem } from "@/lib/whiteboard/server/history";

type Props = {
  classId: string;
  archived: boolean;
  liveGameProject: LiveGameClassProjectOverview;
  whiteboardHistory: WhiteboardRoundHistoryItem[];
  vcSessionHistory: VirtualClassroomSessionHistoryItem[];
  open: boolean;
  onClose: () => void;
};

export function ClassHubHistoryOverlay({
  classId,
  archived,
  liveGameProject,
  whiteboardHistory,
  vcSessionHistory,
  open,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const roundCount = whiteboardHistory.length;
  const gameRounds = liveGameProject.recentRounds.length;
  const vcCount = vcSessionHistory.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close history"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-history-title"
        className="relative z-10 mt-6 w-full max-w-3xl rounded-xl border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <div>
            <h2 id="class-history-title" className="text-base font-semibold text-neutral-900">
              Class history
            </h2>
            <p className="mt-0.5 text-sm text-neutral-600">
              {vcCount} live session{vcCount === 1 ? "" : "s"}
              {" · "}
              {roundCount} whiteboard round{roundCount === 1 ? "" : "s"}
              {" · "}
              {gameRounds} recent live game{gameRounds === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-200 px-2.5 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Close
          </button>
        </div>
        <div className="max-h-[min(70vh,40rem)] space-y-4 overflow-y-auto px-4 py-4">
          <VirtualClassroomSessionHistory sessions={vcSessionHistory} />
          <LiveGameClassProjectPanel
            classId={classId}
            archived={archived}
            overview={liveGameProject}
          />
          <WhiteboardClassHistory classId={classId} rounds={whiteboardHistory} />
        </div>
      </div>
    </div>
  );
}
