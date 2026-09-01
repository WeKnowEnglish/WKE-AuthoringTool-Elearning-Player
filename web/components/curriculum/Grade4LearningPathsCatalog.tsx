import Image from "next/image";
import Link from "next/link";
import { BookOpen, Check, ChevronRight, Clock3, Lock, Mic2, Sparkles } from "lucide-react";

import { GRADE_4_MOVERS_COURSE } from "@/lib/curriculum/grade-4-movers";

export function Grade4LearningPathsCatalog({ pilotMode = false }: { pilotMode?: boolean }) {
  const unit = GRADE_4_MOVERS_COURSE.units[0];
  const firstSession = unit.sessions[0];
  const secondSession = unit.sessions[1];
  const thirdSession = unit.sessions[2];
  const launchHref = pilotMode ? firstSession.pilotHref : firstSession.studentHref;
  const secondLaunchHref = pilotMode ? secondSession.pilotHref : secondSession.studentHref;
  const thirdLaunchHref = pilotMode ? thirdSession.pilotHref : thirdSession.studentHref;

  return (
    <main className="min-h-dvh bg-[#f5f3ff] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="overflow-hidden rounded-[2rem] border border-violet-200 bg-white shadow-sm">
          <div className="relative min-h-56">
            <Image
              src={GRADE_4_MOVERS_COURSE.coverImage}
              alt="Children sharing their interests at the Grade 4 Welcome Fair"
              fill
              priority
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#24104f]/95 via-[#3d2174]/80 to-transparent" />
            <div className="relative z-10 max-w-2xl px-6 py-8 text-white sm:px-9 sm:py-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-violet-950">
                <Sparkles className="h-4 w-4" /> New learning path
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Grade 4 WKE Learning Paths
              </h1>
              <p className="mt-2 text-lg font-extrabold text-violet-100">
                Active English for Cambridge Movers
              </p>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/85 sm:text-base">
                Speak, explore, listen, read, and create through one connected learning journey.
              </p>
            </div>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-violet-200 bg-white p-2 shadow-sm" aria-label="Course tabs">
          <span className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-extrabold text-white">
            <BookOpen className="h-4 w-4" /> Grade 4 WKE Learning Paths
          </span>
        </nav>

        <section className="rounded-[2rem] border border-violet-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-600">Unit 1</p>
              <h2 className="mt-1 text-2xl font-black">{unit.title}</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                {unit.description}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              In production
            </span>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="space-y-3">
            <article className="overflow-hidden rounded-[1.5rem] border-2 border-violet-300 bg-violet-50">
              <div className="grid sm:grid-cols-[15rem_minmax(0,1fr)]">
                <div className="relative min-h-48 sm:min-h-full">
                  <Image
                    src={GRADE_4_MOVERS_COURSE.coverImage}
                    alt="The Welcome Fair learning scene"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col justify-between p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black text-violet-700">
                      <span>SESSION 1</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600">
                        <Clock3 className="h-3.5 w-3.5" /> {firstSession.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600">
                        <Mic2 className="h-3.5 w-3.5" /> Speaking first
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-black">{firstSession.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                      {firstSession.description}
                    </p>
                  </div>
                  {launchHref ? (
                    <Link
                      href={launchHref}
                      className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-violet-800"
                    >
                      Start Session 1 <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>

            <article className="overflow-hidden rounded-[1.5rem] border-2 border-fuchsia-300 bg-fuchsia-50">
              <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black text-fuchsia-700">
                    <span>SESSION 2</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600"><Clock3 className="h-3.5 w-3.5" /> {secondSession.durationMinutes} min</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600"><Mic2 className="h-3.5 w-3.5" /> Ask and listen</span>
                  </div>
                  <h3 className="mt-2 text-xl font-black">{secondSession.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{secondSession.description}</p>
                </div>
                {secondLaunchHref ? <Link href={secondLaunchHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-fuchsia-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-fuchsia-800">Play Session 2 <ChevronRight className="h-4 w-4" /></Link> : <span className="inline-flex min-h-12 shrink-0 items-center rounded-xl bg-slate-100 px-5 text-sm font-black text-slate-400"><Lock className="mr-2 h-4 w-4" /> Coming next</span>}
              </div>
            </article>

            <article className="overflow-hidden rounded-[1.5rem] border-2 border-amber-300 bg-amber-50">
              <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black text-amber-800">
                    <span>SESSION 3</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600"><Clock3 className="h-3.5 w-3.5" /> {thirdSession.durationMinutes} min</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600"><Mic2 className="h-3.5 w-3.5" /> Ask and connect</span>
                  </div>
                  <h3 className="mt-2 text-xl font-black">{thirdSession.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{thirdSession.description}</p>
                </div>
                {thirdLaunchHref ? <Link href={thirdLaunchHref} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-amber-700">Play Session 3 <ChevronRight className="h-4 w-4" /></Link> : <span className="inline-flex min-h-12 shrink-0 items-center rounded-xl bg-slate-100 px-5 text-sm font-black text-slate-400"><Lock className="mr-2 h-4 w-4" /> Coming next</span>}
              </div>
            </article>
            </div>

            <aside className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black">Unit journey</p>
              <ol className="mt-3 space-y-2">
                {unit.sessions.map((session) => (
                  <li key={session.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-slate-600">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${session.status === "pilot" ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {session.status === "pilot" ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                    </span>
                    <span>Session {session.order}</span>
                    <span className="ml-auto text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {session.status === "pilot" ? "Pilot" : "Planned"}
                    </span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
