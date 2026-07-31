import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";

const btnClass =
  "inline-flex items-center justify-center rounded-lg border-2 border-kid-ink bg-white px-4 py-2.5 text-sm font-extrabold text-kid-ink shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform [touch-action:manipulation] hover:translate-y-px focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink";

/** Compact student entrance under the hero — does not compete with teacher messaging. */
export function LandingStudentAccessStrip() {
  return (
    <section
      aria-label="Student access"
      className="border-b border-kid-ink/10 bg-[#eff6ff]"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-5 sm:flex-row sm:items-center sm:px-8">
        <div>
          <p className="text-base font-extrabold text-kid-ink">
            Already learning with We Know English?
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--landing-body-muted)]">
            Sign in to your account or enter the class code your teacher shared.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TrackedMarketingLink
            href="/login"
            event="student_signin_click"
            eventProps={{ cta: "student_sign_in", userRole: "student", authState: "anonymous" }}
            className={btnClass}
          >
            Student Sign In
          </TrackedMarketingLink>
          <TrackedMarketingLink
            href="/join-class"
            event="join_class_click"
            eventProps={{ cta: "enter_class_code", userRole: "student", authState: "anonymous" }}
            className={btnClass}
          >
            Enter Class Code
          </TrackedMarketingLink>
        </div>
      </div>
    </section>
  );
}
