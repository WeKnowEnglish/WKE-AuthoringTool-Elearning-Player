import { ParentBookTrialForm } from "@/components/parent/ParentBookTrialForm";
import { listOpenAvailabilityForTeacher } from "@/lib/data/trial-availability";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";

export default async function ParentBookTrialByTeacherIdPage(props: {
  params: Promise<{ teacherId: string }>;
  searchParams?: Promise<{ student?: string }>;
}) {
  const { teacherId } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const [students, slots] = await Promise.all([
    listParentLinkedStudents(),
    listOpenAvailabilityForTeacher(teacherId),
  ]);

  const preferredStudent =
    typeof sp.student === "string" && students.some((s) => s.studentId === sp.student)
      ? sp.student
      : students[0]?.studentId ?? null;

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <ParentBookTrialForm
        teacherTitle={null}
        slots={slots}
        childrenOptions={students.map((student) => ({
          studentId: student.studentId,
          displayName: student.displayName,
        }))}
        initialStudentId={preferredStudent}
      />
    </div>
  );
}
