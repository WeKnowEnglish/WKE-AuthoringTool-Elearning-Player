import { VirtualClassroomClassPanel } from "@/components/teacher/VirtualClassroomClassPanel";
import type { ClassLesson } from "@/lib/class-lessons/types";

type Props = {
  classId: string;
  archived: boolean;
  activeSession: {
    sessionId: string;
    joinCode: string;
    classLessonId?: string | null;
  } | null;
  readyLessons: ClassLesson[];
};

export function TeachTab({
  classId,
  archived,
  activeSession,
  readyLessons,
}: Props) {
  return (
    <div className="space-y-4">
      <VirtualClassroomClassPanel
        classId={classId}
        archived={archived}
        activeSession={activeSession}
        readyLessons={readyLessons}
      />
    </div>
  );
}
