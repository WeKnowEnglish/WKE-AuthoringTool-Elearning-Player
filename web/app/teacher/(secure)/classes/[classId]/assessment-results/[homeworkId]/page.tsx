import Link from "next/link";
import { notFound } from "next/navigation";
import { listAssessmentResultsForTeacher } from "@/lib/data/assessment-attempts";
import { getClassHomework } from "@/lib/data/class-homework";
import { getTeacherClass } from "@/lib/data/teacher-classes";

type Props = { params: Promise<{ classId: string; homeworkId: string }> };

export default async function AssessmentResultsPage({ params }: Props) {
  const { classId, homeworkId } = await params;
  const [teacherClass, homework, rows] = await Promise.all([
    getTeacherClass(classId),
    getClassHomework(homeworkId),
    listAssessmentResultsForTeacher({ classId, homeworkId }),
  ]);
  if (!teacherClass || !homework || homework.classId !== classId || homework.payload.type !== "primary_a2_assessment") notFound();
  const submitted = rows.filter((row) => row.status === "submitted");
  const average = submitted.length
    ? Math.round(submitted.reduce((sum, row) => sum + (row.objectiveTotal ? row.correct / row.objectiveTotal : 0), 0) / submitted.length * 100)
    : null;
  return <main className="space-y-5">
    <Link href={`/teacher/classes/${classId}?tab=students`} className="text-sm font-semibold text-teal-700 underline">← Students & Homework</Link>
    <header className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{teacherClass.title} · Assessment results</p>
      <h1 className="mt-1 text-2xl font-bold text-neutral-900">{homework.title}</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ResultStat label="Submitted" value={`${submitted.length}/${rows.length}`} />
        <ResultStat label="In progress" value={String(rows.filter((row) => row.status === "in_progress").length)} />
        <ResultStat label="Class average" value={average === null ? "—" : `${average}%`} />
      </div>
    </header>
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Answered</th><th className="px-4 py-3">Objective score</th><th className="px-4 py-3">Speaking recordings</th><th className="px-4 py-3">Last update</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.studentId} className="border-t border-neutral-100">
            <td className="px-4 py-3 font-semibold text-neutral-900">{row.displayName}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === "submitted" ? "bg-emerald-100 text-emerald-800" : row.status === "in_progress" ? "bg-amber-100 text-amber-900" : "bg-neutral-100 text-neutral-600"}`}>{row.status.replace("_", " ")}</span></td>
            <td className="px-4 py-3 text-neutral-700">{`${row.answered}/${row.itemTotal}`}</td>
            <td className="px-4 py-3 font-semibold text-neutral-900">{row.status === "submitted" && row.objectiveTotal ? `${row.correct}/${row.objectiveTotal} · ${Math.round(row.correct / row.objectiveTotal * 100)}%` : "—"}</td>
            <td className="px-4 py-3"><div className="flex min-w-52 flex-col gap-2">{row.recordings.length ? row.recordings.map((recording, index) => <div key={recording.id}><p className="mb-1 text-xs font-semibold text-neutral-500">Speaking part {index + 1} · {Math.round(recording.durationMs / 1000)} sec</p>{recording.url ? <audio controls preload="none" src={recording.url} className="h-9 w-52" aria-label={`Play ${row.displayName}'s speaking part ${index + 1}`} /> : <span className="text-xs text-neutral-500">Audio unavailable</span>}</div>) : <span className="text-neutral-500">No recordings</span>}</div></td>
            <td className="px-4 py-3 text-neutral-600">{row.updatedAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.updatedAt)) : "Not started"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </main>;
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-neutral-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p><p className="mt-1 text-xl font-bold text-neutral-900">{value}</p></div>;
}
