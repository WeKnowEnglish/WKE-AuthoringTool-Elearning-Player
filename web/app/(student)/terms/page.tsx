import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Terms",
  description: `Terms of use for ${SITE_NAME}.`,
  pathname: "/terms",
});

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <h1 className="text-3xl font-extrabold text-kid-ink">Terms of use</h1>
        <p className="mt-4 text-sm font-semibold text-[var(--landing-body-muted)]">
          Last updated: 27 July 2026
        </p>
        <div className="mt-8 space-y-4 text-base font-semibold leading-relaxed text-kid-ink/80">
          <p>
            By using {SITE_NAME}, you agree to use the platform for legitimate educational
            purposes, respect class and account access controls, and not attempt to disrupt
            services or access data that is not yours.
          </p>
          <p>
            Teacher accounts are responsible for appropriate class setup and for how student
            accounts are invited into their classes. Students should follow their teacherΓÇÖs
            instructions when joining a class.
          </p>
          <p>
            Free public activities are provided as-is for educational use. Product features
            may change as we improve the platform.
          </p>
          <p>
            Questions:{" "}
            <a href="mailto:hello@weknowenglish.online" className="font-extrabold underline">
              hello@weknowenglish.online
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
