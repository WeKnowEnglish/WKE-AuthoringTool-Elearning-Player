import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quick start quiz (lab)",
  description: "Internal lab for topic quizzes and vocab experiments. Students use Primary.",
};

/**
 * F5 — /teststartpage is lab-only. Canonical student UX is /primary.
 * Shared modules (VocabularySetOverlay, quiz loaders) stay in use from Primary.
 */
export default function TestStartPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-neutral-900">
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-950">
        Lab only — students use{" "}
        <Link href="/primary" className="font-extrabold underline underline-offset-2">
          Primary Learning
        </Link>
        . Topic quizzes live under Self Study.
      </div>
      {children}
    </div>
  );
}
