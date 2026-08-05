import Link from "next/link";
import { notFound } from "next/navigation";
import { getClassHomework } from "@/lib/data/class-homework";
import { listHomeworkWritingSubmissionsForTeacher } from "@/lib/data/homework-writing-submissions";
import { getTeacherClass } from "@/lib/data/teacher-classes";

function formatWhen(value: string | null) {
  if (!value) return "Not submitted";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function HomeworkWritingResultsPage({
  params,
}: {
  params: Promise<{ classId: string; homeworkId: string }>;
}) {
  const { classId, homeworkId } = await params;
  const [teacherClass, homework, submissions] = await Promise.all([
    getTeacherClass(classId),
    getClassHomework(homeworkId),
    listHomeworkWritingSubmissionsForTeacher({ classId, homeworkId }),
  ]);
  if (!teacherClass || !homework || homework.classId !== classId) notFound();
  if (homework.payload.type !== "writing_prompt") notFound();

  const submitted = submissions.filter((row) => row.status === "submitted");

  return (
    <main className="space-y-5">
      <Link
        href={`/teacher/classes/${classId}?tab=students`}
        className="text-sm font-semibold text-teal-700 underline"
      >
        ← Students &amp; Homework
      </Link>
      <header className="rounded-xl border border-neutral-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {teacherClass.title} · Writing homework
        </p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">{homework.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-800">{homework.payload.prompt}</p>
        {homework.payload.instructions ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">
            {homework.payload.instructions}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-neutral-600">
          {submitted.length} submitted · {submissions.length} saved draft
          {submissions.length === 1 ? "" : "s"}
        </p>
      </header>

      {submissions.length === 0 ? (
        <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">
          No student writing saved yet.
        </section>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <section
              key={submission.id}
              className="rounded-xl border border-neutral-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-neutral-900">{submission.displayName}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    submission.status === "submitted"
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {submission.status === "submitted" ? "Submitted" : "Draft"}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {submission.status === "submitted"
                  ? `Submitted ${formatWhen(submission.submittedAt)}`
                  : `Last saved ${formatWhen(submission.updatedAt)}`}
              </p>
              <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm text-neutral-900">{submission.text}</p>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
