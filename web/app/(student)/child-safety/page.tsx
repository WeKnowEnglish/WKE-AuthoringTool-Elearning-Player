import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Child safety",
  description: `How ${SITE_NAME} approaches child and student safety on the learning platform.`,
  pathname: "/child-safety",
});

export default function ChildSafetyPage() {
  return (
    <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <h1 className="text-3xl font-extrabold text-kid-ink">Child and student safety</h1>
        <div className="mt-8 space-y-4 text-base font-semibold leading-relaxed text-kid-ink/80">
          <p>
            {SITE_NAME} is designed for English learning in school and home contexts under
            teacher or parent guidance.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Student class joining is code- or teacher-mediated.</li>
            <li>
              Public marketing measurement avoids collecting student names, emails, join
              codes, written answers, chat, or audio.
            </li>
            <li>
              Live classroom tools are intended for teacher-hosted sessions, not open public
              chat rooms.
            </li>
          </ul>
          <p>
            If you have a safety concern about an account or class, contact{" "}
            <a href="mailto:hello@weknowenglish.online" className="font-extrabold underline">
              hello@weknowenglish.online
            </a>{" "}
            immediately.
          </p>
          <p className="text-sm text-[var(--landing-body-muted)]">
            We do not claim certification under every national childrenΓÇÖs privacy regime on
            this page. Policies will be expanded with jurisdiction-specific review as the
            product is offered in additional countries.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
