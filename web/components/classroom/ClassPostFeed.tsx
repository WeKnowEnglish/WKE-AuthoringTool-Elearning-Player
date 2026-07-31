import { Sparkles } from "lucide-react";
import type { ClassPost } from "@/lib/class-posts/types";
import { ClassroomPostCard } from "@/components/classroom/ClassroomPostCard";

type Props = {
  posts: ClassPost[];
  tone?: "primary" | "secondary";
  /** Override section heading. Pass empty string to hide. */
  heading?: string;
  /** Friendlier empty copy for Stream vs full board. */
  emptyTitle?: string;
  emptyDetail?: string;
  /** When true, split pinned posts into a labeled block above the rest. */
  showPinnedSection?: boolean;
};

export function ClassPostFeed({
  posts,
  tone = "primary",
  heading = "Class noticeboard",
  emptyTitle = "Nothing on the board yet",
  emptyDetail = "When your teacher posts a message or photo, it will show up here.",
  showPinnedSection = false,
}: Props) {
  const isSecondary = tone === "secondary";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted)]";
  const ink = isSecondary ? "text-sec-ink" : "text-[var(--pl-ink)]";
  const shell = isSecondary
    ? "rounded-xl border border-sec-border bg-sec-card"
    : "rounded-[1.75rem] border border-[var(--pl-border)] bg-white/80 shadow-sm";

  if (posts.length === 0) {
    return (
      <section
        className={`${shell} px-5 py-8 text-center sm:px-6`}
        aria-labelledby="classroom-board-heading"
      >
        {heading ? (
          <h2 id="classroom-board-heading" className={`text-base font-extrabold ${ink}`}>
            {heading}
          </h2>
        ) : (
          <span id="classroom-board-heading" className="sr-only">
            Class posts
          </span>
        )}
        <span
          className={`mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-3xl ${
            isSecondary
              ? "bg-sec-panel-muted text-sec-accent"
              : "bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]"
          }`}
        >
          <Sparkles className="h-7 w-7" aria-hidden />
        </span>
        <p className={`mt-4 text-base font-extrabold ${ink}`}>{emptyTitle}</p>
        <p className={`mx-auto mt-1 max-w-sm text-sm font-semibold ${muted}`}>
          {emptyDetail}
        </p>
      </section>
    );
  }

  const pinned = showPinnedSection ? posts.filter((post) => post.pinnedAt) : [];
  const rest = showPinnedSection ? posts.filter((post) => !post.pinnedAt) : posts;

  return (
    <section aria-labelledby="classroom-board-heading">
      {heading ? (
        <h2
          id="classroom-board-heading"
          className={`mb-3 text-base font-extrabold ${ink}`}
        >
          {heading}
        </h2>
      ) : (
        <span id="classroom-board-heading" className="sr-only">
          Class posts
        </span>
      )}

      {pinned.length > 0 ? (
        <div className="mb-5 space-y-3">
          <p
            className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${
              isSecondary ? "text-sec-accent" : "text-[var(--pl-purple)]"
            }`}
          >
            Pinned
          </p>
          <ul className="space-y-4">
            {pinned.map((post) => (
              <li key={post.id}>
                <ClassroomPostCard post={post} tone={tone} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rest.length > 0 ? (
        <ul className="space-y-4">
          {rest.map((post) => (
            <li key={post.id}>
              <ClassroomPostCard post={post} tone={tone} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
