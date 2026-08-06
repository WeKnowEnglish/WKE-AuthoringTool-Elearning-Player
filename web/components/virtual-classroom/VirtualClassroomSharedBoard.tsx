"use client";

import { boardIdForScope } from "@/lib/whiteboard/domain";
import { WhiteboardCanvas } from "@/components/pilots/whiteboard/WhiteboardCanvas";
import type { WhiteboardAuthRole } from "@/lib/whiteboard/domain";

type Props = {
  sessionId: string;
  role: WhiteboardAuthRole;
  userId: string;
  /** When false, only the teacher can draw. Synced for the whole class. */
  studentPensEnabled: boolean;
  /** Host toggles student pens. */
  onToggleStudentPens?: (enabled: boolean) => void;
  pensBusy?: boolean;
};

/**
 * One shared drawing surface for Learn — teacher and students draw on the same board.
 * Not the breakout/activity whiteboard (phases, personal boards, collect/review).
 */
export function VirtualClassroomSharedBoard({
  sessionId,
  role,
  userId,
  studentPensEnabled,
  onToggleStudentPens,
  pensBusy = false,
}: Props) {
  const boardId = boardIdForScope({ type: "teacher" });
  const isHost = role === "host";
  const studentReadOnly = !isHost && !studentPensEnabled;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Class board
          </p>
          <p className="text-sm text-slate-600">
            {studentPensEnabled
              ? "Everyone can draw here together."
              : isHost
                ? "Student pens are off — only you can draw."
                : "Watch only — the teacher turned pens off."}
          </p>
        </div>
        {isHost && onToggleStudentPens ? (
          <button
            type="button"
            disabled={pensBusy}
            aria-pressed={studentPensEnabled}
            onClick={() => onToggleStudentPens(!studentPensEnabled)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              studentPensEnabled
                ? "border border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100"
                : "border border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {studentPensEnabled ? "Turn off student pens" : "Turn on student pens"}
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 p-2">
        <WhiteboardCanvas
          boardId={boardId}
          mode="edit"
          sessionId={sessionId}
          role={role}
          userId={userId}
          showPrompt={false}
          sharedEdit
          readOnly={studentReadOnly}
        />
      </div>
    </div>
  );
}
