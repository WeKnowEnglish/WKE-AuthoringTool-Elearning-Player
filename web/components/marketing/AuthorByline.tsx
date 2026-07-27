import Link from "next/link";
import {
  reviewStatusLabel,
  type ContentReviewStatus,
} from "@/lib/seo/content-review";

type Props = {
  authorName?: string;
  reviewStatus: ContentReviewStatus;
  datePublished: string;
  dateModified: string;
};

export function AuthorByline({
  authorName = "Brady Myers",
  reviewStatus,
  datePublished,
  dateModified,
}: Props) {
  const statusLabel = reviewStatusLabel(reviewStatus);

  return (
    <aside className="mb-8 rounded-xl border-2 border-kid-ink/15 bg-[#fff8eb] p-4 text-sm font-semibold text-kid-ink/80">
      <p>
        Written by{" "}
        <Link href="/about" className="font-extrabold text-kid-ink underline underline-offset-2">
          {authorName}
        </Link>
        , M.Ed.
      </p>
      {statusLabel ? <p className="mt-1">{statusLabel}.</p> : null}
      <p className="mt-1 text-xs text-[var(--landing-body-muted)]">
        Published {datePublished}
        {dateModified !== datePublished ? ` · Updated ${dateModified}` : null}
      </p>
    </aside>
  );
}
