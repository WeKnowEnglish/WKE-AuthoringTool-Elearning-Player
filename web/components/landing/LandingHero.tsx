import Image from "next/image";
import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";

const HERO_IMAGE = "/landing/hero-family-standing.png";
const MOBILE_HERO_IMAGE = "/landing/hero-mobile-teacher-child.png";

/**
 * Server-rendered hero — H1 and core copy are in the initial HTML without client JS.
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-kid-ink/10 bg-[#fff3dd]">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        sizes="100vw"
        className="hidden object-cover object-top sm:block"
      />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-[#fff8ec]/95 via-[#fff8ec]/70 to-transparent sm:block" />
      <div className="relative mx-auto hidden max-w-6xl items-center px-4 pt-8 sm:grid sm:min-h-[31rem] sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <div className="relative z-10 pb-8 text-center sm:pb-0">
          <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
            For ESL teachers, students and families
          </p>
          <h1 className="mt-2 text-[1.75rem] font-extrabold leading-[1.12] text-kid-ink sm:mt-3 sm:text-4xl lg:text-[2.75rem]">
            One Connected Platform for Teaching and Learning English
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:mt-4 sm:text-lg">
            Plan lessons, create interactive activities, teach online, assign
            homework, track student progress, and share meaningful reports with
            families.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:flex-wrap sm:justify-center sm:gap-3">
            <TrackedMarketingLink
              href="/login?portal=teacher"
              event="teacher_signup_start"
              eventProps={{ cta: "start_teaching", userRole: "teacher", authState: "anonymous" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-3 py-3 text-center text-sm font-extrabold leading-tight text-white shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform [touch-action:manipulation] hover:translate-y-px active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink sm:px-5 sm:shadow-[4px_4px_0_0_var(--kid-shadow)]"
            >
              Start Teaching
            </TrackedMarketingLink>
            <TrackedMarketingLink
              href="#free-activities"
              event="free_activity_view"
              eventProps={{ cta: "explore_free_activities", landingPage: "/" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-kid-ink bg-white px-3 py-3 text-center text-sm font-extrabold leading-tight text-kid-ink shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform [touch-action:manipulation] hover:translate-y-px active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink sm:px-5 sm:shadow-[4px_4px_0_0_var(--kid-shadow)]"
            >
              Explore Free ESL Activities
            </TrackedMarketingLink>
          </div>
        </div>
        <div aria-hidden />
      </div>
      <div className="relative min-h-[32rem] sm:hidden">
        <Image
          src={MOBILE_HERO_IMAGE}
          alt="A smiling teacher carrying an excited student"
          fill
          priority
          sizes="100vw"
          className="scale-x-[-1] object-cover object-[78%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#fff8ec]/95 via-[#fff8ec]/72 to-transparent" />
        <div className="absolute inset-y-0 right-0 flex w-[62%] flex-col items-end justify-center px-4 py-8 text-right">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
            For ESL teachers, students and families
          </p>
          <h1 className="mt-2 text-[1.8rem] font-extrabold leading-[1.08] text-kid-ink">
            One Connected Platform for Teaching and Learning English
          </h1>
          <p className="mt-3 max-w-[14rem] text-sm font-semibold leading-relaxed text-[var(--landing-body-muted)]">
            Plan lessons, create interactive activities, teach online, assign
            homework, track student progress, and share meaningful reports with
            families.
          </p>
          <div className="mt-5 flex w-full max-w-[13rem] flex-col gap-3">
            <TrackedMarketingLink
              href="/login?portal=teacher"
              event="teacher_signup_start"
              eventProps={{ cta: "start_teaching", userRole: "teacher", authState: "anonymous" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-3 py-3 text-center text-sm font-extrabold leading-tight text-white shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform [touch-action:manipulation] active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
            >
              Start Teaching
            </TrackedMarketingLink>
            <TrackedMarketingLink
              href="#free-activities"
              event="free_activity_view"
              eventProps={{ cta: "explore_free_activities", landingPage: "/" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-kid-ink bg-white px-3 py-3 text-center text-sm font-extrabold leading-tight text-kid-ink shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform [touch-action:manipulation] active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
            >
              Explore Free ESL Activities
            </TrackedMarketingLink>
          </div>
        </div>
      </div>
    </section>
  );
}
