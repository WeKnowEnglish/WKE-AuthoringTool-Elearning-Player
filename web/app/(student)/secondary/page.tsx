import { SecondaryHome } from "@/components/secondary/SecondaryHome";
import { listAssignedHomeworkForStudent } from "@/lib/data/class-homework";
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

  return (
    <SecondaryHome
      classMemberships={classMemberships}
      liveSessions={liveSessions}
      assignedHomework={assignedHomework}
    />
  );
}
