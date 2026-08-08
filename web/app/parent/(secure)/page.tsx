import { redirect } from "next/navigation";
import { ParentHomeEmptyView } from "@/components/parent/ParentHomeEmptyView";
import {
  listParentOwnTrialBookings,
  listParentOwnUpcomingTrialOccurrences,
} from "@/lib/data/trial-availability";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export default async function ParentHomePage() {
  const students = await listParentLinkedStudents();
  if (students[0]) redirect(`/parent/students/${students[0].studentId}/stream`);

  const [bookings, occurrences] = await Promise.all([
    listParentOwnTrialBookings(),
    listParentOwnUpcomingTrialOccurrences(),
  ]);

  return <ParentHomeEmptyView bookings={bookings} occurrences={occurrences} />;
}
