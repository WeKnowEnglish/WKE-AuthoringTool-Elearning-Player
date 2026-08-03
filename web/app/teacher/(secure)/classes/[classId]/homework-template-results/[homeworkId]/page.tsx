import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeworkTemplateReviewForm } from "@/components/teacher/homework/HomeworkTemplateReviewForm";
import { getClassHomework } from "@/lib/data/class-homework";
import { listHomeworkTemplateSubmissionsForTeacher } from "@/lib/data/homework-template-submissions";
import { getTeacherClass } from "@/lib/data/teacher-classes";
import { getHomeworkTemplateDefinition, homeworkTemplatePartLabel } from "@/lib/homework-templates/registry";

export default async function HomeworkTemplateResultsPage({ params }: { params: Promise<{ classId: string; homeworkId: string }> }) {
  const { classId, homeworkId } = await params;
  const [teacherClass, homework, submissions] = await Promise.all([
    getTeacherClass(classId),
    getClassHomework(homeworkId),
    listHomeworkTemplateSubmissionsForTeacher({ classId, homeworkId }),
  ]);
  if (!teacherClass || !homework || homework.classId !== classId || homework.payload.type !== "homework_template") notFound();
  const template = getHomeworkTemplateDefinition(homework.payload.templateId);
  if (!template) notFound();

  return <main className="space-y-5">
    <Link href={`/teacher/classes/${classId}?tab=students`} className="text-sm font-semibold text-teal-700 underline">← Students &amp; Homework</Link>
    <header className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{teacherClass.title} · {template.level} homework review</p>
      <h1 className="mt-1 text-2xl font-bold text-neutral-900">{homework.title}</h1>
      <p className="mt-2 text-sm text-neutral-600">Automatically scored parts show their results immediately. Open responses can be scored and given feedback below.</p>
    </header>

    {submissions.length === 0 ? <section className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-600">No reviewable submissions are stored yet.</section> : <div className="space-y-4">{submissions.map((submission) => {
      const parts = Object.entries(submission.content.parts).map(([partId, part]) => ({
        id: partId,
        label: homeworkTemplatePartLabel(template.id, partId),
        ...part,
      }));
      const autoParts = parts.filter((part) => part.correct !== null);
      const autoCorrect = autoParts.reduce((total, part) => total + (part.correct ?? 0), 0);
      const autoTotal = autoParts.reduce((total, part) => total + part.total, 0);
      const reviewedParts = Object.values(submission.review?.grades ?? {});
      const reviewedScore = reviewedParts.reduce((total, grade) => total + grade.score, 0);
      const reviewedTotal = reviewedParts.reduce((total, grade) => total + grade.maxScore, 0);
      return <section key={submission.id} className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{submission.displayName}</h2>
            <p className="text-xs text-neutral-500">Updated {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(submission.updatedAt))}</p>
            {(autoTotal || reviewedTotal) ? <p className="mt-1 text-sm font-bold text-neutral-700">Recorded score: {autoCorrect + reviewedScore}/{autoTotal + reviewedTotal}</p> : null}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${submission.status === "submitted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{submission.status.replace("_", " ")}</span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">{parts.map((part) => {
          const recording = submission.recordings.find((item) => item.partId === part.id);
          return <article key={part.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-neutral-900">{part.label}</h3>
            {part.correct === null ? <span className="text-xs font-semibold text-amber-700">Teacher review</span> : <span className="text-xs font-semibold text-emerald-700">{part.correct}/{part.total} correct</span>}
          </div>
          <dl className="mt-3 space-y-2">{Object.entries(part.answers).map(([id, answer]) => <div key={id}><dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{id}</dt><dd className="whitespace-pre-wrap text-sm font-medium text-neutral-800">{answer}</dd></div>)}</dl>
          {recording?.url ? <audio controls preload="metadata" src={recording.url} className="mt-3 w-full" aria-label={`${part.label} recording`} /> : null}
        </article>;
        })}</div>

        <HomeworkTemplateReviewForm
          classId={classId}
          homeworkId={homeworkId}
          submissionId={submission.id}
          parts={parts.map((part) => ({ id: part.id, label: part.label, total: part.total, correct: part.correct }))}
          initialGrades={submission.review?.grades ?? {}}
          initialFeedback={submission.review?.feedback ?? ""}
        />
      </section>;
    })}</div>}
  </main>;
}
