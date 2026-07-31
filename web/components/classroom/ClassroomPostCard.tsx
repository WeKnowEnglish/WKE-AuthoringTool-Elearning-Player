import Image from "next/image";
import Link from "next/link";
import {
  BookOpenCheck,
  Camera,
  ExternalLink,
  Gamepad2,
  Link2,
  Megaphone,
  Pin,
} from "lucide-react";
import type { ClassPost, ClassPostKind } from "@/lib/class-posts/types";

type Props = {
  post: ClassPost;
  tone?: "primary" | "secondary";
};

function formatRelativePostDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.round(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function kindMeta(
  kind: ClassPostKind,
  isSecondary: boolean,
): {
  label: string;
  Icon: typeof Megaphone;
  chip: string;
  bar: string;
} {
  if (kind === "photo") {
    return {
      label: "Photo",
      Icon: Camera,
      chip: isSecondary ? "bg-sky-100 text-sky-900" : "bg-sky-100 text-sky-800",
      bar: "bg-sky-400",
    };
  }
  if (kind === "link") {
    return {
      label: "Link",
      Icon: Link2,
      chip: isSecondary ? "bg-emerald-100 text-emerald-950" : "bg-emerald-100 text-emerald-800",
      bar: "bg-emerald-500",
    };
  }
  if (kind === "homework_reminder") {
    return {
      label: "Homework",
      Icon: BookOpenCheck,
      chip: isSecondary ? "bg-orange-100 text-orange-950" : "bg-orange-100 text-orange-900",
      bar: "bg-orange-500",
    };
  }
  if (kind === "activity") {
    return {
      label: "Activity",
      Icon: Gamepad2,
      chip: isSecondary ? "bg-violet-100 text-violet-950" : "bg-violet-100 text-violet-900",
      bar: "bg-violet-500",
    };
  }
  return {
    label: "Message",
    Icon: Megaphone,
    chip: isSecondary
      ? "bg-amber-100 text-amber-950"
      : "bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]",
    bar: isSecondary ? "bg-sec-accent" : "bg-[var(--pl-purple)]",
  };
}

export function ClassroomPostCard({ post, tone = "primary" }: Props) {
  const isSecondary = tone === "secondary";
  const isPhoto = post.kind === "photo" && Boolean(post.imageUrl);
  const isPinned = Boolean(post.pinnedAt);
  const ink = isSecondary ? "text-sec-ink" : "text-[var(--pl-ink)]";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted)]";
  const border = isSecondary ? "border-sec-border" : "border-[var(--pl-border)]";
  const { label: kindLabel, Icon: KindIcon, chip: kindStyles, bar: accentBar } = kindMeta(
    post.kind,
    isSecondary,
  );

  const homeworkHref = post.homeworkId
    ? `${isSecondary ? "/secondary" : "/primary"}/homework/${post.homeworkId}`
    : null;

  const linkLabel = post.linkTitle?.trim() || post.linkUrl || "Open link";
  const activityLabel = post.activityTitle?.trim() || "Class activity";
  const ctaClass = isSecondary
    ? "inline-flex items-center gap-2 rounded-xl bg-sec-accent px-3.5 py-2.5 text-sm font-extrabold text-white"
    : "inline-flex items-center gap-2 rounded-xl bg-[var(--pl-purple)] px-3.5 py-2.5 text-sm font-extrabold text-white";

  return (
    <article
      className={`relative overflow-hidden rounded-[1.5rem] border bg-white shadow-sm ${border} ${
        isPinned ? (isSecondary ? "ring-2 ring-sec-accent/30" : "ring-2 ring-[var(--pl-purple)]/25") : ""
      }`}
    >
      <div className={`h-1.5 w-full ${accentBar}`} aria-hidden />

      <div className="flex items-center gap-3 px-4 pb-2 pt-3 sm:px-5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
            isSecondary
              ? "bg-sec-panel-muted text-sec-accent"
              : "bg-[var(--pl-purple)] text-white"
          }`}
          aria-hidden
        >
          T
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`truncate text-sm font-extrabold ${ink}`}>Teacher</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${kindStyles}`}
            >
              <KindIcon className="h-3 w-3" aria-hidden />
              {kindLabel}
            </span>
            {isPinned ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                  isSecondary
                    ? "bg-sec-panel-muted text-sec-accent"
                    : "bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]"
                }`}
              >
                <Pin className="h-3 w-3" aria-hidden />
                Pinned
              </span>
            ) : null}
          </div>
          <p className={`text-xs font-semibold ${muted}`}>
            {formatRelativePostDate(post.publishedAt)}
          </p>
        </div>
      </div>

      {isPhoto && post.imageUrl ? (
        <div className="relative mt-1 aspect-[16/10] w-full overflow-hidden bg-neutral-100 sm:aspect-[2/1]">
          <Image
            src={post.imageUrl}
            alt={post.body?.trim() || "Class photo"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 720px"
            unoptimized
          />
        </div>
      ) : null}

      {post.kind === "link" && post.linkUrl ? (
        <div className="mx-4 mt-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-3 sm:mx-5">
          <p className={`truncate text-sm font-extrabold ${ink}`}>{linkLabel}</p>
          <p className={`mt-0.5 truncate text-xs font-medium ${muted}`}>{post.linkUrl}</p>
        </div>
      ) : null}

      {post.kind === "activity" && post.activityPlayPath ? (
        <div className="mx-4 mt-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-3.5 py-3 sm:mx-5">
          <p className={`truncate text-sm font-extrabold ${ink}`}>{activityLabel}</p>
          <p className={`mt-0.5 text-xs font-medium ${muted}`}>Play this activity</p>
        </div>
      ) : null}

      {post.body?.trim() ? (
        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <p
            className={`whitespace-pre-wrap text-[15px] font-semibold leading-relaxed ${ink} ${
              isPhoto || post.kind === "link" || post.kind === "activity"
                ? ""
                : "text-base sm:text-[17px]"
            }`}
          >
            {post.body}
          </p>
        </div>
      ) : isPhoto ||
        post.kind === "link" ||
        post.kind === "homework_reminder" ||
        post.kind === "activity" ? (
        <div className="h-3" />
      ) : null}

      {post.kind === "link" && post.linkUrl ? (
        <div className="px-4 pb-4 sm:px-5">
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClass}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open link
          </a>
        </div>
      ) : null}

      {post.kind === "homework_reminder" && homeworkHref ? (
        <div className="px-4 pb-4 sm:px-5">
          <Link href={homeworkHref} className={ctaClass}>
            <BookOpenCheck className="h-4 w-4" aria-hidden />
            Open homework
          </Link>
        </div>
      ) : null}

      {post.kind === "activity" && post.activityPlayPath ? (
        <div className="px-4 pb-4 sm:px-5">
          <Link href={post.activityPlayPath} className={ctaClass}>
            <Gamepad2 className="h-4 w-4" aria-hidden />
            Open activity
          </Link>
        </div>
      ) : null}
    </article>
  );
}
