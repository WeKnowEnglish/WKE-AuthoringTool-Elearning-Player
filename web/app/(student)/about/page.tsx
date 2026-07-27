import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "About",
  description:
    "Meet Brady Myers, M.Ed. ΓÇö ESL teacher and curriculum designer behind We Know English interactive activities and teaching tools.",
  pathname: "/about",
});

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Brady Myers",
  jobTitle: "ESL Teacher and Curriculum Designer",
  worksFor: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  url: `${SITE_URL}/about`,
  description:
    "M.Ed. classroom teacher designing interactive ESL activities that connect live teaching, homework, and independent practice.",
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
        <LandingHeader />
        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
          <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
            About
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-kid-ink sm:text-4xl">
            Built by a teacher for connected English learning
          </h1>
          <p className="mt-4 text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:text-lg">
            {SITE_NAME} is created by Brady Myers, M.Ed. ΓÇö an ESL teacher and curriculum
            designer focused on interactive lessons that work across classroom teaching,
            homework, and self-study.
          </p>

          <section className="mt-10 space-y-4 text-base font-semibold leading-relaxed text-kid-ink/80">
            <h2 className="text-xl font-extrabold text-kid-ink">Educational approach</h2>
            <p>
              Activities are designed around clear language goals, age-appropriate
              interaction, and reuse: create once, then teach live, assign for homework,
              and review what students understand.
            </p>
            <p>
              Content review status is recorded per resource. Claims such as
              ΓÇ£classroom-testedΓÇ¥ appear only when that specific resource was actually tested
              with learners.
            </p>
          </section>

          <section className="mt-10 space-y-4 text-base font-semibold leading-relaxed text-kid-ink/80">
            <h2 className="text-xl font-extrabold text-kid-ink">Who this platform serves</h2>
            <p>
              Teachers searching for interactive ESL activities and classroom tools;
              students practising English in class or at home; and parents looking for
              structured practice rather than random screen time.
            </p>
          </section>

          <p className="mt-10 text-sm font-semibold text-[var(--landing-body-muted)]">
            Questions?{" "}
            <Link href="/contact" className="font-extrabold text-kid-ink underline">
              Contact us
            </Link>
            .
          </p>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
