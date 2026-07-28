import { SecondaryHome } from "@/components/secondary/SecondaryHome";
import { listAssignedHomeworkForStudent } from "@/lib/data/class-homework";
import { getClassScheduleForStudentClass } from "@/lib/data/class-meeting-slots";
import { listActiveLiveSessionsForStudent } from "@/lib/data/student-live";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { requireSecondaryStudentAccess } from "./_lib/requireSecondaryAccess";

export default async function SecondaryHomePage() {
  await requireSecondaryStudentAccess();
  const [classMemberships, liveSessions, assignedHomework] = await Promise.all([
    getStudentClassMemberships(),
    listActiveLiveSessionsForStudent(),
    listAssignedHomeworkForStudent(),
  ]);

  const schedules = await Promise.all(
    classMemberships.map(async (membership) => ({
      classId: membership.classId,
      schedule: await getClassScheduleForStudentClass(membership.classId),
    })),
  );
  const schedulesByClassId = Object.fromEntries(
    schedules.map((entry) => [entry.classId, entry.schedule]),
  );

  return (
    <SecondaryHome
      classMemberships={classMemberships}
      liveSessions={liveSessions}
      assignedHomework={assignedHomework}
      schedulesByClassId={schedulesByClassId}
    />
  );
}
