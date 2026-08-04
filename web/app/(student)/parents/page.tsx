import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/json-ld";

const pathname = "/parents";
const title = "Parents | We Know English";
const description =
  "How We Know English works for families: structured English, book a trial with a teacher, then follow your child’s progress — without random screen time.";

export const metadata: Metadata = buildPublicMetadata({
  title,
  description,
  pathname,
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Parents", path: pathname },
];

const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbs);

const ctaPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_var(--kid-shadow)]";
const ctaSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-kid-ink bg-white px-5 py-3 text-sm font-extrabold text-kid-ink shadow-[4px_4px_0_0_var(--kid-shadow)]";

export default function ParentsLandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
        <LandingHeader />

        <section className="relative overflow-hidden border-b border-kid-ink/10">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 10% 20%, #ffe8c2 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, #d7f0ea 0%, transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--landing-primary-title)]">
              For families
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-kid-ink sm:text-5xl">
              We Know English
            </h1>
            <p className="mt-4 max-w-xl text-lg font-semibold leading-relaxed text-kid-ink/80">
              Structured English for your child — teacher-led lessons, clear practice, and a
              parent view you can trust. Start with a short trial.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TrackedMarketingLink
                href="/parent/login?next=/parents/teachers"
                event="audience_parent_click"
                eventProps={{ cta: "create_account" }}
                className={ctaPrimary}
              >
                Create a parent account
              </TrackedMarketingLink>
              <TrackedMarketingLink
                href="/parents/teachers"
                event="audience_parent_click"
                eventProps={{ cta: "find_teacher" }}
                className={ctaSecondary}
              >
                Find a teacher & book a trial
              </TrackedMarketingLink>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-extrabold sm:text-3xl">How it works</h2>
          <p className="mt-3 max-w-2xl text-base font-semibold text-[var(--landing-body-muted)]">
            You do not need a class code or an enrolled student account to request a first trial.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Sign up",
                body: "Create a parent account with your email. No student login required yet.",
              },
              {
                step: "2",
                title: "Book a trial",
                body: "Choose a teacher accepting trials and pick an open time that fits your family.",
              },
              {
                step: "3",
                title: "Meet the teacher",
                body: "The teacher confirms the slot. You get a clear time for a placement or trial lesson.",
              },
              {
                step: "4",
                title: "Join the class journey",
                body: "After placement, your child joins class practice and you see updates in the parent portal.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="rounded-2xl border-2 border-kid-ink/15 bg-white p-5 shadow-[3px_3px_0_0_var(--kid-shadow)]"
              >
                <p className="text-xs font-black uppercase tracking-wide text-[var(--landing-primary-title)]">
                  Step {item.step}
                </p>
                <h3 className="mt-2 text-lg font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/75">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-kid-ink/10 bg-white/70">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Our approach</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Teacher-led, not random apps",
                  body: "Lessons and homework connect to a real teacher. Practice has a goal, a length, and a finish line.",
                },
                {
                  title: "Age-band English",
                  body: "Primary and Secondary paths use level-appropriate vocabulary, listening, and writing — not one-size-fits-all games.",
                },
                {
                  title: "Parents stay in the loop",
                  body: "Once linked, you see the next lesson, class updates the teacher shares, and progress reports — not a firehose of scores.",
                },
              ].map((item) => (
                <li key={item.title} className="rounded-xl border border-kid-ink/15 bg-[var(--landing-page-bg)] p-5">
                  <h3 className="text-lg font-extrabold">{item.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/75">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Already in a class?</h2>
          <p className="mt-3 max-w-2xl text-base font-semibold text-[var(--landing-body-muted)]">
            If your child&apos;s teacher invited you by email, sign in with that exact address and
            open the invitation link. That is how you link to an enrolled student.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/parent/login" className={ctaPrimary}>
              Parent portal sign in
            </Link>
            <Link href="/english-learning-for-kids-at-home" className={ctaSecondary}>
              Home practice ideas
            </Link>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
