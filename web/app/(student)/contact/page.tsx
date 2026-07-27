import type { Metadata } from "next";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";
import { SITE_NAME } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicMetadata({
  title: "Contact",
  description: `Contact ${SITE_NAME} about teaching tools, classes, or platform support.`,
  pathname: "/contact",
});

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <h1 className="text-3xl font-extrabold text-kid-ink">Contact</h1>
        <p className="mt-4 text-base font-semibold leading-relaxed text-[var(--landing-body-muted)]">
          For teacher onboarding, class support, or product questions, email{" "}
          <a
            href="mailto:hello@weknowenglish.online"
            className="font-extrabold text-kid-ink underline underline-offset-2"
          >
            hello@weknowenglish.online
          </a>
          .
        </p>
        <p className="mt-4 text-base font-semibold leading-relaxed text-kid-ink/80">
          Students: if your teacher gave you a class code, use{" "}
          <a href="/join-class" className="font-extrabold underline">
            Join a class
          </a>
          . If you already have an account,{" "}
          <a href="/login" className="font-extrabold underline">
            sign in
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
