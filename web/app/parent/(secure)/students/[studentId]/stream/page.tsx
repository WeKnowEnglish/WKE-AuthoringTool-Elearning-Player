import { ParentNextLessonCard } from "@/components/parent/ParentNextLessonCard";
import { ParentSchedulePreferenceCard } from "@/components/parent/ParentSchedulePreferenceCard";
import { ParentStreamFeed } from "@/components/parent/ParentStreamFeed";
import { ParentTrialStatusCard } from "@/components/parent/ParentTrialStatusCard";
import {
  listParentTrialBookingsForStudent,
  listParentUpcomingTrialOccurrences,
} from "@/lib/data/trial-availability";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import { getParentStudentSchedule } from "@/lib/parent/parent-schedule";
import { getParentSchedulePreferenceContext } from "@/lib/parent/parent-schedule-preferences";
import { listParentStream } from "@/lib/parent/parent-stream";

export default async function ParentStudentStreamPage(props: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await props.params;
  const [students, items, schedule, preferenceContext, trialBookings, trialOccurrences] =
    await Promise.all([
      listParentLinkedStudents(),
      listParentStream(studentId),
      getParentStudentSchedule(studentId),
      getParentSchedulePreferenceContext(studentId),
      listParentTrialBookingsForStudent(studentId),
      listParentUpcomingTrialOccurrences(studentId),
    ]);
  const student = students.find((candidate) => candidate.studentId === studentId);

  return (
    <div className="space-y-4">
      {preferenceContext ? (
        <ParentSchedulePreferenceCard
          classId={preferenceContext.classId}
          studentId={studentId}
          classTitle={preferenceContext.classTitle}
          windows={preferenceContext.windows}
          initialRankedWindowIds={preferenceContext.rankedWindowIds}
        />
      ) : null}
      <ParentTrialStatusCard bookings={trialBookings} occurrences={trialOccurrences} />
      <ParentNextLessonCard
        classTitle={schedule.classTitle ?? student?.classTitle ?? null}
        nextMeeting={schedule.nextMeeting}
        slots={schedule.slots}
      />
      <ParentStreamFeed
        studentName={student?.displayName ?? null}
        items={items}
      />
    </div>
  );
}
