import { ParentBookTrialForm } from "@/components/parent/ParentBookTrialForm";
import { listOpenAvailabilityForTeacher } from "@/lib/data/trial-availability";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function ParentBookTrialByHandlePage(props: {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<{ student?: string }>;
}) {
  const { handle } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolve_trial_teacher_by_handle", {
    p_handle: handle,
  });

  if (error || !data || typeof data !== "object" || !(data as { ok?: boolean }).ok) {
    notFound();
  }

  const payload = data as { teacherId?: string; title?: string };
  const teacherId = typeof payload.teacherId === "string" ? payload.teacherId : "";
  if (!teacherId) notFound();

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
        teacherTitle={typeof payload.title === "string" ? payload.title : null}
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
