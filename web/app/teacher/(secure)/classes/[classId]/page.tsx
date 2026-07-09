import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveClassButton } from "@/components/teacher/ArchiveClassButton";
import { ClassJoinCodePanel } from "@/components/teacher/ClassJoinCodePanel";
import { ClassRosterTable } from "@/components/teacher/ClassRosterTable";
import { getClassMasteryOverview } from "@/lib/data/teacher-mastery";
import { getClassRoster, getTeacherClass } from "@/lib/data/teacher-classes";

type Props = {
  params: Promise<{ classId: string }>;
};

export default async function TeacherClassDetailPage({ params }: Props) {
  const { classId } = await params;
  const teacherClass = await getTeacherClass(classId);
  if (!teacherClass) notFound();

  const [roster, masteryOverview] = await Promise.all([
    getClassRoster(classId),
    getClassMasteryOverview(classId),
  ]);

  const masteryByStudentId = Object.fromEntries(
    masteryOverview.students.map((preview) => [preview.studentId, preview]),
  );

  const archived = Boolean(teacherClass.archived_at);

  return (
    <div className="space-y-6">
      <Link href="/teacher/classes" className="text-sm text-blue-700 underline">
        ← Classes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{teacherClass.title}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {roster.length} student{roster.length === 1 ? "" : "s"}
            {archived ? " · Archived" : ""}
          </p>
        </div>
        <ArchiveClassButton classId={classId} archived={archived} />
      </div>

      <ClassJoinCodePanel
        classId={classId}
        joinCode={teacherClass.join_code}
        archived={archived}
      />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Roster</h2>
        <ClassRosterTable
          classId={classId}
          students={roster}
          masteryByStudentId={masteryByStudentId}
        />
      </section>
    </div>
  );
}
