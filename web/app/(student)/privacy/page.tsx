import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Privacy",
  description: `How ${SITE_NAME} approaches privacy for teachers, students, and families.`,
  pathname: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <h1 className="text-3xl font-extrabold text-kid-ink">Privacy</h1>
        <p className="mt-4 text-sm font-semibold text-[var(--landing-body-muted)]">
          Last updated: 27 July 2026
        </p>
        <div className="mt-8 space-y-4 text-base font-semibold leading-relaxed text-kid-ink/80">
          <p>
            {SITE_NAME} is an educational platform used by teachers and students. We aim to
            collect only the information needed to run classes, activities, and accounts.
          </p>
          <h2 className="pt-2 text-xl font-extrabold text-kid-ink">What we collect</h2>
          <p>
            Account details (such as email for teachers), class membership, and learning
            activity needed to deliver lessons and progress. Marketing analytics on public
            pages are limited to non-personal event names and coarse product properties
            (for example activity type or CEFR band) — not student names, emails, join codes,
            answers, chat, or audio.
          </p>
          <h2 className="pt-2 text-xl font-extrabold text-kid-ink">Children</h2>
          <p>
            Student experiences are designed for classroom and home learning under teacher
            or parent guidance. We use high-privacy defaults for marketing measurement and
            avoid collecting unnecessary personal information from children. See also{" "}
            <a href="/child-safety" className="font-extrabold underline">
              Child safety
            </a>
            .
          </p>
          <h2 className="pt-2 text-xl font-extrabold text-kid-ink">Contact</h2>
          <p>
            Privacy questions:{" "}
            <a href="mailto:hello@weknowenglish.online" className="font-extrabold underline">
              hello@weknowenglish.online
            </a>
            .
          </p>
          <p className="text-sm text-[var(--landing-body-muted)]">
            This page describes current product intent. Formal legal counsel review may
            expand or revise these terms as the platform scales across jurisdictions.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
