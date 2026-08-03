import { BookOpenText } from "lucide-react";
import { ParentProgressReportView } from "@/components/parent/ParentProgressReportView";
import { getParentPublishedProgressReport } from "@/lib/parent/progress-report-data";

export default async function ParentStudentProgressPage(props: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await props.params;
  const report = await getParentPublishedProgressReport(studentId);

  if (report) {
    return (
      <ParentProgressReportView
        snapshot={report.snapshot}
        publishedAt={report.publishedAt}
      />
    );
  }

  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
      <BookOpenText className="mx-auto h-9 w-9 text-indigo-500" aria-hidden />
      <h2 className="mt-4 text-xl font-black">A progress update is being prepared</h2>
      <p className="mx-auto mt-2 max-w-lg leading-relaxed text-slate-600">
        When the teacher reviews and publishes a progress report, it will appear here with clear
        strengths, next steps, and one practical way to help at home.
      </p>
    </section>
  );
}
