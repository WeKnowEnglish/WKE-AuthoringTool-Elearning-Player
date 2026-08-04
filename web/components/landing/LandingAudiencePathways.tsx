import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";

const linkClass =
  "inline-flex items-center justify-center rounded-lg border-2 border-kid-ink/25 bg-white px-4 py-2 text-sm font-extrabold text-kid-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink";

export function LandingAudiencePathways() {
  return (
    <section aria-labelledby="audience-pathways-heading" className="border-t border-kid-ink/10 bg-[var(--landing-page-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <h2 id="audience-pathways-heading" className="text-2xl font-extrabold text-kid-ink sm:text-3xl">
          Choose how you want to continue
        </h2>
        <p className="mt-3 max-w-2xl text-base font-semibold text-[var(--landing-body-muted)]">
          Teachers get the full product path. Students get a clear way in. Parents get a
          structured home-practice pathway.
        </p>

        <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
          <article className="rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-4 shadow-[4px_4px_0_0_var(--kid-shadow)] sm:p-6 sm:shadow-[6px_6px_0_0_var(--kid-shadow)]">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
              Primary pathway
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-kid-ink">Teachers</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/75">
              Create classes, author activities, teach live, assign homework, and review
              progress in one connected workspace.
            </p>
            <TrackedMarketingLink
              href="/login?portal=teacher"
              event="audience_teacher_click"
              eventProps={{ cta: "teacher_pathway" }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-4 py-2.5 text-sm font-extrabold text-white sm:mt-5 sm:w-auto"
            >
              Start teaching
            </TrackedMarketingLink>
          </article>

          <article className="rounded-xl border-2 border-kid-ink/20 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-extrabold text-kid-ink">Students</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/75">
              Choose Primary or Secondary, sign in, join your class, or try a free practice
              activity.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-col">
              <TrackedMarketingLink
                href="/students"
                event="audience_student_click"
                eventProps={{ cta: "student_pathway_signin" }}
                className={`col-span-2 ${linkClass}`}
              >
                Sign in
              </TrackedMarketingLink>
              <TrackedMarketingLink
                href="/join-class"
                event="audience_student_click"
                eventProps={{ cta: "student_pathway_join" }}
                className={linkClass}
              >
                Join a class
              </TrackedMarketingLink>
              <TrackedMarketingLink
                href="#free-activities"
                event="audience_student_click"
                eventProps={{ cta: "student_pathway_practice" }}
                className={linkClass}
              >
                Try free practice
              </TrackedMarketingLink>
            </div>
          </article>

          <article className="rounded-xl border-2 border-kid-ink/20 bg-white p-4 sm:p-5">
            <h3 className="text-lg font-extrabold text-kid-ink">Parents</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/75">
              Find structured English practice for your child — not random screen time.
              Start with free grammar and vocabulary activities, then connect with your
              child’s teacher when a class is ready.
            </p>
            <TrackedMarketingLink
              href="#free-activities"
              event="audience_parent_click"
              eventProps={{ cta: "parent_pathway" }}
              className={`mt-4 min-h-11 w-full sm:w-auto ${linkClass}`}
            >
              Explore home practice
            </TrackedMarketingLink>
          </article>
        </div>
      </div>
    </section>
  );
}
