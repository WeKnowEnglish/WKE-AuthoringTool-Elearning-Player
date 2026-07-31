import Image from "next/image";
import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";
import { LANDING_TEACHER_MASCOT } from "@/lib/landing/landing-assets";

const CAPABILITIES = [
  "Teacher-created content, not only a fixed library",
  "Rostered private classes",
  "Assignments with evidence of student work",
  "Student learning paths connected to instruction",
  "Live multiplayer teaching tools",
  "Progress and mastery tracking",
] as const;

export function LandingTeachersSection() {
  return (
    <section
      id="for-teachers"
      aria-labelledby="teachers-heading"
      className="border-y border-kid-ink/10 bg-[#fff8eb]"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,22rem)] lg:gap-10">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
              For teachers
            </p>
            <h2 id="teachers-heading" className="mt-2 text-2xl font-extrabold text-kid-ink sm:text-3xl">
              Plan, create, teach, and track from one workspace
            </h2>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:text-lg">
              Search for activities, author lessons, run live classes, assign homework, and review
              what each learner still needs — without leaving the platform.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {CAPABILITIES.map((item) => (
                <li
                  key={item}
                  className="rounded-lg border-2 border-kid-ink/15 bg-white px-4 py-3 text-sm font-bold text-kid-ink"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <TrackedMarketingLink
                href="/login?portal=teacher"
                event="audience_teacher_click"
                eventProps={{ cta: "explore_teacher_tools", userRole: "teacher" }}
                className="inline-flex items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_var(--kid-shadow)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
              >
                Explore Teacher Tools
              </TrackedMarketingLink>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[18rem] items-end justify-center lg:mx-0 lg:max-w-none">
            <Image
              src={LANDING_TEACHER_MASCOT}
              alt=""
              width={480}
              height={514}
              className="h-auto w-full max-h-[20rem] scale-x-[-1] object-contain object-bottom drop-shadow-[0_12px_24px_rgba(15,23,42,0.12)] sm:max-h-[24rem] lg:max-h-[28rem]"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}
