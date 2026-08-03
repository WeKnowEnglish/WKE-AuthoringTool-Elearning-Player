import {
  BookOpenCheck,
  CalendarDays,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import {
  PARENT_PROGRESS_STATUS_COPY,
  type ParentProgressSnapshot,
  type ParentProgressStatus,
} from "@/lib/parent/progress-report";

const statusClass: Record<ParentProgressStatus, string> = {
  collecting_evidence: "bg-slate-100 text-slate-700",
  getting_started: "bg-rose-100 text-rose-800",
  developing: "bg-amber-100 text-amber-900",
  secure: "bg-emerald-100 text-emerald-800",
  strong: "bg-teal-100 text-teal-800",
};

function formatObservedAt(value: string | null): string {
  if (!value) return "Recent practice";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Recent practice";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ParentProgressReportView(props: {
  snapshot: ParentProgressSnapshot;
  publishedAt?: string | null;
  preview?: boolean;
}) {
  const { snapshot } = props;
  return (
    <article className="space-y-5" aria-label={`Progress report for ${snapshot.studentName}`}>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-indigo-100">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" aria-hidden />
            {snapshot.periodLabel}
          </span>
          {props.preview ? (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wide">
              Parent preview
            </span>
          ) : props.publishedAt ? (
            <span>Published {formatObservedAt(props.publishedAt)}</span>
          ) : null}
        </div>
        <h2 className="mt-5 text-3xl font-black tracking-tight">
          {snapshot.studentName}&apos;s learning update
        </h2>
        <p className="mt-2 text-indigo-100">{snapshot.classTitle}</p>
        <div className="mt-6 rounded-2xl bg-white/12 p-4 backdrop-blur-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-indigo-100">
            Current learning
          </p>
          <p className="mt-2 text-lg font-bold leading-relaxed">{snapshot.currentTopic}</p>
          <p className="mt-3 leading-relaxed text-indigo-50">{snapshot.recentLearning}</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-2 text-emerald-800">
            <Sparkles className="h-5 w-5" aria-hidden />
            <h3 className="font-black">Doing well</h3>
          </div>
          <p className="mt-3 text-lg font-black text-emerald-950">{snapshot.doingWell.title}</p>
          <p className="mt-2 leading-relaxed text-emerald-950/80">{snapshot.doingWell.detail}</p>
        </section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-900">
            <Target className="h-5 w-5" aria-hidden />
            <h3 className="font-black">Next focus</h3>
          </div>
          <p className="mt-3 text-lg font-black text-amber-950">{snapshot.nextFocus.title}</p>
          <p className="mt-2 leading-relaxed text-amber-950/80">{snapshot.nextFocus.detail}</p>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-indigo-600" aria-hidden />
          <h3 className="text-xl font-black">Learning skills</h3>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {snapshot.skills.map((skill) => (
            <div key={skill.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-extrabold text-slate-950">{skill.label}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${statusClass[skill.status]}`}>
                  {PARENT_PROGRESS_STATUS_COPY[skill.status].label}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{skill.description}</p>
              <p className="mt-3 text-xs font-bold text-slate-500">{skill.evidenceLabel}</p>
            </div>
          ))}
        </div>
      </section>

      {snapshot.evidence.length > 0 ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-xl font-black">Recent learning evidence</h3>
          <div className="mt-4 space-y-3">
            {snapshot.evidence.map((item, index) => (
              <div key={`${item.title}:${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
                <div>
                  <p className="font-extrabold">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.detail}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {formatObservedAt(item.observedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-indigo-600" aria-hidden />
            <h3 className="text-xl font-black">Teacher summary</h3>
          </div>
          <p className="mt-4 leading-relaxed text-slate-700">{snapshot.teacherSummary}</p>
        </div>
        <div className="rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-fuchsia-800">
            <HeartHandshake className="h-5 w-5" aria-hidden />
            <h3 className="text-xl font-black">Try this at home</h3>
          </div>
          <p className="mt-4 font-extrabold text-fuchsia-950">{snapshot.homeSupport.title}</p>
          <p className="mt-2 leading-relaxed text-fuchsia-950/80">
            {snapshot.homeSupport.instruction}
          </p>
          <p className="mt-3 text-sm font-extrabold text-fuchsia-800">
            About {snapshot.homeSupport.minutes} minutes
          </p>
        </div>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-700">
        <p className="font-extrabold">{snapshot.evidenceScope.label}</p>
        <p className="mt-1 leading-relaxed">{snapshot.evidenceScope.caveat}</p>
      </aside>
    </article>
  );
}
