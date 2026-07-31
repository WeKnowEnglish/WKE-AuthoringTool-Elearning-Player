import Link from "next/link";
import type { ClassPost } from "@/lib/class-posts/types";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { StudentClassSchedule } from "@/lib/class-schedule/types";
import { ClassPostFeed } from "@/components/classroom/ClassPostFeed";
import { ClassroomHomeworkSideCard } from "@/components/classroom/ClassroomHomeworkSideCard";
import { ClassroomNextClassCard } from "@/components/classroom/ClassroomNextClassCard";

type Props = {
  posts: ClassPost[];
  schedule: StudentClassSchedule;
  recentHomework?: StudentHomeworkCard[];
  homeworkBasePath?: "/primary" | "/secondary";
  tone?: "primary" | "secondary";
  /** Link to full noticeboard tab when feed is truncated. */
  noticeboardHref?: string;
  scheduleHref?: string;
};

const STREAM_POST_LIMIT = 8;

export function ClassroomStream({
  posts,
  schedule,
  recentHomework = [],
  homeworkBasePath = "/primary",
  tone = "primary",
  noticeboardHref,
  scheduleHref,
}: Props) {
  const isSecondary = tone === "secondary";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted)]";
  const ink = isSecondary ? "text-sec-ink" : "text-[var(--pl-ink)]";
  const pinned = posts.filter((post) => Boolean(post.pinnedAt));
  const unpinned = posts.filter((post) => !post.pinnedAt);
  const feedSlots = Math.max(STREAM_POST_LIMIT - pinned.length, 0);
  const recentPosts = [...pinned, ...unpinned.slice(0, feedSlots)];
  const hasMore = unpinned.length > feedSlots;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-5">
      <div className="order-2 flex flex-col gap-4 lg:order-1">
        <div>
          <div className="mb-3 flex items-end justify-between gap-2 px-0.5">
            <div>
              <h2 className={`text-lg font-extrabold tracking-tight ${ink}`}>
                Class stream
              </h2>
              <p className={`text-xs font-semibold ${muted}`}>
                Messages, photos, links, and activities from your teacher
              </p>
            </div>
            {hasMore && noticeboardHref ? (
              <Link
                href={noticeboardHref}
                className={`shrink-0 text-xs font-extrabold ${
                  isSecondary ? "text-sec-accent" : "text-[var(--pl-purple)]"
                } hover:underline`}
              >
                See all
              </Link>
            ) : null}
          </div>
          <ClassPostFeed
            posts={recentPosts}
            tone={tone}
            heading=""
            showPinnedSection
            emptyTitle="Your class wall is waiting"
            emptyDetail="Photos, shout-outs, and reminders from your teacher will land here. Check back soon!"
          />
          {hasMore && noticeboardHref ? (
            <div className="mt-4 text-center">
              <Link
                href={noticeboardHref}
                className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 text-sm font-extrabold ${
                  isSecondary
                    ? "border-sec-border text-sec-accent"
                    : "border-[var(--pl-border)] text-[var(--pl-purple)]"
                } bg-white hover:bg-[var(--pl-bg)]`}
              >
                Open full noticeboard
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="order-1 flex flex-col gap-3 lg:sticky lg:top-4 lg:order-2">
        <ClassroomHomeworkSideCard
          items={recentHomework}
          homeworkBasePath={homeworkBasePath}
          tone={tone}
        />
        <ClassroomNextClassCard
          nextMeeting={schedule.nextMeeting}
          scheduleHref={scheduleHref}
          tone={tone}
        />
      </aside>
    </div>
  );
}
