import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";
import { LandingTeacherWorkflow } from "@/components/landing/LandingTeacherWorkflow";

export function LandingTeachersSection() {
  return (
    <section
      id="for-teachers"
      aria-label="For teachers"
      className="border-y border-kid-ink/10 bg-[#fff8eb]"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <LandingTeacherWorkflow />
        <div className="mt-7 flex justify-center">
          <TrackedMarketingLink
            href="/login?portal=teacher"
            event="audience_teacher_click"
            eventProps={{ cta: "explore_teacher_tools", userRole: "teacher" }}
            className="inline-flex items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_var(--kid-shadow)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
          >
            Explore more tools
          </TrackedMarketingLink>
        </div>
      </div>
    </section>
  );
}
