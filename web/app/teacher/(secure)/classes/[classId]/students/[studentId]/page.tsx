import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentDiagnosticTabs } from "@/components/teacher/mastery/StudentDiagnosticTabs";
import { GuardianConnectionsPanel } from "@/components/teacher/guardians/GuardianConnectionsPanel";
import { ParentProgressPublishingPanel } from "@/components/teacher/guardians/ParentProgressPublishingPanel";
import { ParentStreamPublishingPanel } from "@/components/teacher/guardians/ParentStreamPublishingPanel";
import { getStudentDiagnosticBundle } from "@/lib/data/teacher-mastery";
import { getSentenceSubmissionsForStudent } from "@/lib/data/teacher-sentence-submissions";
import { formatRelativeDate } from "@/lib/mastery/teacher-mastery-display";
import { listGuardianConnectionsForTeacher } from "@/lib/parent/guardian-data";
import { listParentStreamPublicationsForTeacher } from "@/lib/parent/parent-stream";
import { listProgressReportsForTeacher } from "@/lib/parent/progress-report-data";

type Props = {
  params: Promise<{ classId: string; studentId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function formatBand(band: string | null): string {
  if (!band) return "—";
  return band.toUpperCase();
}

function formatEnrolledDate(iso: string): string {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : iso;
}

export default async function TeacherStudentDiagnosticPage({ params, searchParams }: Props) {
  const { classId, studentId } = await params;
  const { tab } = await searchParams;
  const bundle = await getStudentDiagnosticBundle(classId, studentId);
  if (!bundle) notFound();

  const [sentenceSubmissions, guardianBundle, parentStreamPublications, progressReports] = await Promise.all([
    getSentenceSubmissionsForStudent(classId, studentId),
    listGuardianConnectionsForTeacher(classId, studentId).catch(() => null),
    listParentStreamPublicationsForTeacher(classId, studentId).catch(() => null),
    listProgressReportsForTeacher(classId, studentId).catch(() => null),
  ]);
  const initialTab = tab === "writing" ? "writing" : undefined;

  const { teacherClass, student, diagnostic, needsAttention } = bundle;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-sm">
        <Link href="/teacher/classes" className="text-blue-700 underline">
          ← Classes
        </Link>
        <div>
          <Link href={`/teacher/classes/${classId}`} className="text-blue-700 underline">
            {teacherClass.title}
          </Link>
          <span className="text-neutral-500"> / {student.displayName}</span>
        </div>
      </div>

      <header className="space-y-2 rounded border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{student.displayName}</h1>
            <p className="mt-1 text-sm text-neutral-600">
              @{student.username} · Band {formatBand(student.learningBand)} · Enrolled{" "}
              {formatEnrolledDate(student.enrolledAt)}
            </p>
          </div>
          {needsAttention && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              Needs attention
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-600">
          {diagnostic.recordCount} tracked target{diagnostic.recordCount === 1 ? "" : "s"} · Last
          active {formatRelativeDate(diagnostic.latestUpdatedAt)}
          {diagnostic.dueReview.length > 0 && (
            <>
              {" "}
              ·{" "}
              <span className="font-medium text-amber-800">
                {diagnostic.dueReview.length} due for review
              </span>
            </>
          )}
        </p>
      </header>

      <GuardianConnectionsPanel
        classId={classId}
        studentId={studentId}
        initialBundle={guardianBundle}
      />

      <ParentStreamPublishingPanel
        classId={classId}
        studentId={studentId}
        publications={parentStreamPublications}
      />

      <ParentProgressPublishingPanel
        classId={classId}
        studentId={studentId}
        reports={progressReports}
      />

      <StudentDiagnosticTabs
        classId={classId}
        diagnostic={bundle.diagnostic}
        strands={bundle.strands}
        vocabularyRows={bundle.vocabularyRows}
        grammarRows={bundle.grammarRows}
        records={bundle.records}
        narrative={bundle.narrative}
        sentenceSubmissions={sentenceSubmissions}
        initialTab={initialTab}
      />
    </div>
  );
}
