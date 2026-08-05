import { VirtualClassroomClassPanel } from "@/components/teacher/VirtualClassroomClassPanel";
import { ClassHubHistoryAccordion } from "@/components/teacher/class-hub/ClassHubHistoryAccordion";
import type { ClassLesson } from "@/lib/class-lessons/types";
import type { LiveGameClassProjectOverview } from "@/lib/data/live-game-class-projects";
import type { VirtualClassroomSessionHistoryItem } from "@/lib/virtual-classroom/session-history-types";
import type { WhiteboardRoundHistoryItem } from "@/lib/whiteboard/server/history";

type Props = {
  classId: string;
  archived: boolean;
  activeSession: {
    sessionId: string;
    joinCode: string;
    classLessonId?: string | null;
  } | null;
  readyLessons: ClassLesson[];
  liveGameProject: LiveGameClassProjectOverview;
  whiteboardHistory: WhiteboardRoundHistoryItem[];
  vcSessionHistory: VirtualClassroomSessionHistoryItem[];
};

export function TeachTab({
  classId,
  archived,
  activeSession,
  readyLessons,
  liveGameProject,
  whiteboardHistory,
  vcSessionHistory,
}: Props) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50/80 to-white px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Teach</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Go live with your class</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Optionally bind a Ready lesson, start Virtual Classroom, then launch each staged step
          from Today’s lesson inside the live session.
        </p>
      </section>

      <VirtualClassroomClassPanel
        classId={classId}
        archived={archived}
        activeSession={activeSession}
        readyLessons={readyLessons}
      />

      <ClassHubHistoryAccordion
        classId={classId}
        archived={archived}
        liveGameProject={liveGameProject}
        whiteboardHistory={whiteboardHistory}
        vcSessionHistory={vcSessionHistory}
      />
    </div>
  );
}
