import { ClassMeetingSchedulePanel } from "@/components/teacher/class-hub/ClassMeetingSchedulePanel";
import { ClassScheduleGroupingPanel } from "@/components/teacher/class-hub/ClassScheduleGroupingPanel";
import type { ClassMeetingSlot } from "@/lib/class-schedule/types";
import type { ClassScheduleGroupingBoard } from "@/lib/class-schedule/preference-types";
import type { ClassRosterStudent } from "@/lib/data/teacher-classes";

type Props = {
  classId: string;
  archived: boolean;
  roster: ClassRosterStudent[];
  meetingSlots: ClassMeetingSlot[];
  scheduleGroupingBoard: ClassScheduleGroupingBoard;
};

export function ClassScheduleTab({
  classId,
  archived,
  roster,
  meetingSlots,
  scheduleGroupingBoard,
}: Props) {
  return (
    <div className="space-y-4">
      <ClassMeetingSchedulePanel
        classId={classId}
        archived={archived}
        initialSlots={meetingSlots}
      />

      <ClassScheduleGroupingPanel
        classId={classId}
        archived={archived}
        roster={roster}
        initialBoard={scheduleGroupingBoard}
      />
    </div>
  );
}
