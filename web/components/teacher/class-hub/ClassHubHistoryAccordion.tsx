"use client";

import { useState } from "react";
import { LiveGameClassProjectPanel } from "@/components/teacher/LiveGameClassProjectPanel";
import { WhiteboardClassHistory } from "@/components/teacher/WhiteboardClassHistory";
import type { LiveGameClassProjectOverview } from "@/lib/data/live-game-class-projects";
import type { WhiteboardRoundHistoryItem } from "@/lib/whiteboard/server/history";

type Props = {
  classId: string;
  archived: boolean;
  liveGameProject: LiveGameClassProjectOverview;
  whiteboardHistory: WhiteboardRoundHistoryItem[];
};

export function ClassHubHistoryAccordion({
  classId,
  archived,
  liveGameProject,
  whiteboardHistory,
}: Props) {
  const [open, setOpen] = useState(false);
  const roundCount = whiteboardHistory.length;
  const gameRounds = liveGameProject.recentRounds.length;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Class history</h2>
          <p className="mt-0.5 text-sm text-neutral-600">
            {roundCount} whiteboard round{roundCount === 1 ? "" : "s"}
            {" · "}
            {gameRounds} recent live game{gameRounds === 1 ? "" : "s"}
          </p>
        </div>
        <span className="text-sm font-semibold text-neutral-700">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-neutral-100 px-4 py-4">
          <LiveGameClassProjectPanel
            classId={classId}
            archived={archived}
            overview={liveGameProject}
          />
          <WhiteboardClassHistory classId={classId} rounds={whiteboardHistory} />
        </div>
      ) : null}
    </section>
  );
}
