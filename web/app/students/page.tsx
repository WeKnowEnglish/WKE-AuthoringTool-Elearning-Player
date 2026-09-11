import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import {
  STUDENT_PRIMARY_LOGIN_PATH,
  STUDENT_SECONDARY_LOGIN_PATH,
} from "@/lib/auth/student-login";

// This public doorway intentionally sits outside the authenticated student layout.
export const metadata: Metadata = {
  title: "Student Sign In",
  description: "Choose Primary or Secondary and sign in to your We Know English learning space.",
  alternates: {
    canonical: "/students",
  },
};

const cardClass =
  "group relative isolate min-h-[22rem] overflow-hidden rounded-[2rem] border-4 p-6 shadow-[7px_7px_0_0_#152668] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#152668] sm:min-h-[25rem] sm:p-8";

export default function StudentsLandingPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#dff5ff_0%,#f7fbff_48%,#fff8eb_100%)] text-kid-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#8de3ff]/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-[#ffd965]/35 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Link
          href="/"
          className="text-lg font-extrabold tracking-tight text-kid-ink sm:text-2xl"
        >
          We Know English
        </Link>
        <span className="rounded-full border-2 border-kid-ink/15 bg-white/85 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-kid-ink/75 shadow-sm sm:text-sm">
          Student sign in
        </span>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-8 sm:pb-16 sm:pt-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#12647c]">
            Welcome, learners!
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-kid-ink sm:text-6xl">
            Where do you learn?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base font-bold leading-relaxed text-kid-ink/70 sm:text-xl">
            Choose your school level. We&apos;ll take you straight to the right sign-in page.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-2 lg:gap-8">
          <Link
            href={STUDENT_PRIMARY_LOGIN_PATH}
            className={`${cardClass} border-kid-ink bg-[#ffe66d]`}
          >
            <div className="relative z-10 flex h-full max-w-[64%] flex-col items-start">
              <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#765600]">
                Grades 1–5
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Primary
              </h2>
              <p className="mt-3 max-w-[10rem] text-base font-bold leading-relaxed text-kid-ink/75 sm:max-w-none sm:text-lg">
                Games, words, stories and class activities.
              </p>
              <span className="mt-auto inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-kid-ink bg-kid-ink px-4 py-3 text-sm font-extrabold text-white shadow-[3px_3px_0_0_#ffffff] transition-transform group-hover:translate-x-1 sm:text-base">
                Primary sign in
                <ArrowRight aria-hidden="true" size={20} strokeWidth={3} />
              </span>
            </div>
            <Image
              src="/landing/primary-mascot.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1023px) 46vw, 24vw"
              className="pointer-events-none object-contain object-right-bottom pl-[52%] pt-8 sm:pl-[48%]"
            />
          </Link>

          <Link
            href={STUDENT_SECONDARY_LOGIN_PATH}
            className={`${cardClass} border-[#172554] bg-[linear-gradient(145deg,#172554_0%,#1d4ed8_58%,#0891b2_100%)] text-white shadow-[7px_7px_0_0_#0f172a] focus-visible:outline-[#172554]`}
          >
            <div className="relative z-10 flex h-full max-w-[64%] flex-col items-start">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-100 ring-1 ring-white/25">
                Grades 6–9
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Secondary
              </h2>
              <p className="mt-3 max-w-[10rem] text-base font-bold leading-relaxed text-blue-50/85 sm:max-w-none sm:text-lg">
                Vocabulary, grammar, homework and progress.
              </p>
              <span className="mt-auto inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-white bg-white px-4 py-3 text-sm font-extrabold text-[#172554] shadow-[3px_3px_0_0_#67e8f9] transition-transform group-hover:translate-x-1 sm:text-base">
                Secondary sign in
                <ArrowRight aria-hidden="true" size={20} strokeWidth={3} />
              </span>
            </div>
            <Image
              src="/landing/secondary-mascot.png"
              alt=""
              fill
              priority
              sizes="(max-width: 1023px) 46vw, 24vw"
              className="pointer-events-none object-contain object-right-bottom pl-[52%] pt-8 sm:pl-[47%]"
            />
          </Link>
        </div>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-kid-ink/15 bg-white/90 p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#075985]">
              <KeyRound aria-hidden="true" size={22} strokeWidth={2.5} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-kid-ink">Have a class code?</h2>
              <p className="mt-1 text-sm font-semibold text-kid-ink/65">
                Join your teacher&apos;s class first.
              </p>
            </div>
          </div>
          <Link
            href="/join-class"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-kid-ink bg-white px-4 py-2.5 text-sm font-extrabold text-kid-ink transition-colors hover:bg-[#e0f2fe] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink sm:mt-0 sm:w-auto"
          >
            Join a class
          </Link>
        </div>

        <p className="mt-7 text-center text-sm font-semibold text-kid-ink/60">
          Not sure which one to choose? Ask your teacher or a grown-up for help.
        </p>
      </section>
    </main>
  );
}
