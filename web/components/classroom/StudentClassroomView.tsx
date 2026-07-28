import Link from "next/link";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { ClassPost } from "@/lib/class-posts/types";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import type { StudentClassMaterial } from "@/lib/class-lessons/types";
import type { StudentClassSchedule } from "@/lib/class-schedule/types";
import { ClassPostFeed } from "@/components/classroom/ClassPostFeed";
import { ClassMaterialsList } from "@/components/classroom/ClassMaterialsList";
import { ClassMeetingSchedule } from "@/components/classroom/ClassMeetingSchedule";
import { ClassroomLiveNowJoin } from "@/components/classroom/ClassroomLiveNowJoin";

type Props = {
  membership: StudentClassMembership;
  posts: ClassPost[];
  materials?: StudentClassMaterial[];
  schedule?: StudentClassSchedule;
  liveSession?: StudentClassLiveSession | null;
  /** Portal home for the back link. */
  homeHref: string;
  homeLabel?: string;
  /** Visual tone — Primary playful vs Secondary calm. */
  tone?: "primary" | "secondary";
};

/**
 * Async private Classroom shell for an enrolled class.
 */
export function StudentClassroomView({
  membership,
  posts,
  materials = [],
  schedule = { slots: [], nextMeeting: null },
  liveSession = null,
  homeHref,
  homeLabel = "Back to home",
  tone = "primary",
}: Props) {
  const isSecondary = tone === "secondary";
  const shell = isSecondary
    ? "rounded-xl border border-sec-border bg-sec-card"
    : "rounded-[1.75rem] border border-[var(--pl-border,#e5e0f0)] bg-white shadow-sm";
  const titleClass = isSecondary
    ? "text-2xl font-extrabold tracking-tight text-sec-ink"
    : "text-2xl font-extrabold tracking-tight text-[var(--pl-ink,#1e1b4b)]";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted,#64748b)]";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <Link
        href={homeHref}
        className={`text-sm font-semibold underline underline-offset-2 ${muted}`}
      >
        ← {homeLabel}
      </Link>

      <header className={`${shell} p-5 sm:p-6`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${muted}`}>My classroom</p>
        <h1 className={`mt-1 ${titleClass}`}>{membership.title}</h1>
        <p className={`mt-2 text-sm ${muted}`}>
          {liveSession
            ? "Your class is live right now. Join below, or check the noticeboard for updates."
            : "Your teacher will post announcements and class materials here. When class goes live, you will join from this page."}
        </p>
      </header>

      {liveSession ? (
        <ClassroomLiveNowJoin session={liveSession} tone={tone} />
      ) : (
        <section className={`${shell} p-5 sm:p-6`} aria-labelledby="classroom-live-heading">
          <h2
            id="classroom-live-heading"
            className={`text-base font-extrabold ${isSecondary ? "text-sec-ink" : "text-neutral-900"}`}
          >
            Live now
          </h2>
          <p className={`mt-2 text-sm ${muted}`}>
            Class is not live right now. When your teacher starts a live lesson, a Join button will
            appear here.
          </p>
        </section>
      )}

      <ClassMeetingSchedule schedule={schedule} tone={tone} />

      <ClassPostFeed posts={posts} tone={tone} />

      <ClassMaterialsList materials={materials} tone={tone} />
    </div>
  );
}
