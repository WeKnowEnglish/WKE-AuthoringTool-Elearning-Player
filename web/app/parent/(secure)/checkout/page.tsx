import { ParentCheckoutView } from "@/components/parent/ParentCheckoutView";
import { isStripeConfigured } from "@/lib/env/stripe-server";
import {
  listActiveLessonPackages,
  listParentLessonOrders,
  listParentStudentLessonCredits,
} from "@/lib/data/lesson-packages";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export const metadata = {
  title: "Buy lessons — Parent portal",
  robots: { index: false, follow: false },
};

export default async function ParentCheckoutPage(props: {
  searchParams: Promise<{ student?: string; canceled?: string }>;
}) {
  const searchParams = await props.searchParams;
  const students = await listParentLinkedStudents();
  const [packages, orders, credits] = await Promise.all([
    listActiveLessonPackages(),
    listParentLessonOrders(),
    listParentStudentLessonCredits(students.map((student) => student.studentId)),
  ]);

  const creditsByStudentId = Object.fromEntries(
    credits.map((row) => [row.studentId, row.remainingLessons]),
  );

  return (
    <ParentCheckoutView
      students={students}
      packages={packages}
      orders={orders}
      creditsByStudentId={creditsByStudentId}
      initialStudentId={searchParams.student?.trim() || null}
      stripeReady={isStripeConfigured()}
      canceled={searchParams.canceled === "1"}
    />
  );
}
