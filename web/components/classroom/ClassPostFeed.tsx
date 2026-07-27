import Image from "next/image";
import type { ClassPost } from "@/lib/class-posts/types";

type Props = {
  posts: ClassPost[];
  tone?: "primary" | "secondary";
};

function formatPostDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClassPostFeed({ posts, tone = "primary" }: Props) {
  const isSecondary = tone === "secondary";
  const shell = isSecondary
    ? "rounded-xl border-2 border-neutral-800 bg-white"
    : "rounded-[1.75rem] border border-[var(--pl-border,#e5e0f0)] bg-white shadow-sm";
  const muted = isSecondary ? "text-neutral-600" : "text-[var(--pl-muted,#64748b)]";

  return (
    <section className={`${shell} p-5 sm:p-6`} aria-labelledby="classroom-board-heading">
      <h2 id="classroom-board-heading" className="text-base font-extrabold text-neutral-900">
        Class noticeboard
      </h2>

      {posts.length === 0 ? (
        <p className={`mt-2 text-sm ${muted}`}>
          No posts yet. Check back after your teacher shares an announcement or photo.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className={`rounded-xl border p-4 ${
                isSecondary ? "border-neutral-200" : "border-[var(--pl-border,#e5e0f0)]"
              }`}
            >
              <p className={`text-xs font-semibold ${muted}`}>{formatPostDate(post.publishedAt)}</p>
              {post.kind === "photo" && post.imageUrl ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
                  <Image
                    src={post.imageUrl}
                    alt={post.body || "Class photo"}
                    width={960}
                    height={540}
                    className="h-auto max-h-80 w-full object-cover"
                    unoptimized
                  />
                </div>
              ) : null}
              {post.body ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">
                  {post.body}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
