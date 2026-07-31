import Image from "next/image";
import { clsx } from "clsx";
import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";
import {
  LANDING_CHARACTER_DISPLAY,
  LANDING_CHARACTERS,
} from "@/lib/landing/landing-assets";

const primaryMascot = LANDING_CHARACTERS.primary;
const primaryDisplay = LANDING_CHARACTER_DISPLAY.primary;

/**
 * Server-rendered hero — H1 and core copy are in the initial HTML without client JS.
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-kid-ink/10 bg-gradient-to-b from-[#fff8eb] to-[var(--landing-page-bg)]">
      <div className="mx-auto grid max-w-6xl items-center gap-5 px-4 pb-0 pt-8 sm:gap-8 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
            All in one, ESL Ecosystem
          </p>
          <h1 className="mt-2 text-[1.75rem] font-extrabold leading-[1.12] text-kid-ink sm:mt-3 sm:text-4xl lg:text-[2.75rem]">
            Interactive ESL activities and teaching tools in one connected platform
          </h1>
          <p className="mt-3 max-w-xl text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:mt-4 sm:text-lg">
            Create, assign, teach, play, and review - all in one tool!
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
            <TrackedMarketingLink
              href="#free-activities"
              event="free_activity_view"
              eventProps={{ cta: "explore_free_activities", landingPage: "/" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-3 py-3 text-center text-sm font-extrabold leading-tight text-white shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform [touch-action:manipulation] hover:translate-y-px active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink sm:px-5 sm:shadow-[4px_4px_0_0_var(--kid-shadow)]"
            >
              Explore Free Activities
            </TrackedMarketingLink>
            <TrackedMarketingLink
              href="/login?portal=teacher"
              event="teacher_signup_start"
              eventProps={{ cta: "start_teaching", userRole: "teacher", authState: "anonymous" }}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-kid-ink bg-white px-3 py-3 text-center text-sm font-extrabold leading-tight text-kid-ink shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform [touch-action:manipulation] hover:translate-y-px active:scale-[0.98] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink sm:px-5 sm:shadow-[4px_4px_0_0_var(--kid-shadow)]"
            >
              Start Teaching
            </TrackedMarketingLink>
          </div>
        </div>
        <div className="relative mx-auto flex w-full max-w-[13rem] items-end justify-center sm:max-w-sm lg:max-w-md">
          <Image
            src={primaryMascot}
            alt="Friendly student character welcoming learners to online English classes"
            width={400}
            height={633}
            priority
            className={clsx(
              "h-auto w-full max-h-[17rem] object-contain object-bottom drop-shadow-[0_12px_24px_rgba(15,23,42,0.12)] sm:max-h-[min(28rem,70vh)]",
              primaryDisplay.flipHorizontal && "scale-x-[-1]",
            )}
            style={{ objectPosition: primaryDisplay.objectPosition }}
          />
        </div>
      </div>
    </section>
  );
}
