import type { Metadata } from "next";
import { ComicReader } from "@/components/comic/ComicReader";
import { loadComicChapterBySlug } from "@/lib/comic/load-chapter";
import { DEFAULT_COMIC_CHAPTER_SLUG } from "@/lib/comic/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WKE Comic | We Know English",
  description: "Read the We Know English comic chapter.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<{ chapter?: string }>;
};

export default async function WkeComicPage({ searchParams }: Props) {
  const requestedChapter = (await searchParams)?.chapter;
  const chapterSlug =
    requestedChapter === "chapter-2" ? "chapter-2" : DEFAULT_COMIC_CHAPTER_SLUG;
  const chapter = await loadComicChapterBySlug(chapterSlug);

  if (!chapter) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#14110f] px-6 text-center text-[#f3e8d8]">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">WKE Comic</h1>
          <p className="mt-3 max-w-md text-sm text-[#f3e8d8]/75">
            This chapter is not ready yet. An administrator can add its pages from the
            comic media workspace.
          </p>
        </div>
      </div>
    );
  }

  return <ComicReader chapter={chapter} />;
}
