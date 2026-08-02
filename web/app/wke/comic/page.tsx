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

export default async function WkeComicPage() {
  const chapter = await loadComicChapterBySlug(DEFAULT_COMIC_CHAPTER_SLUG);

  if (!chapter) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#14110f] px-6 text-center text-[#f3e8d8]">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">WKE Comic</h1>
          <p className="mt-3 max-w-md text-sm text-[#f3e8d8]/75">
            Chapter 1 is not ready yet. An admin needs to apply migration 098 and upload
            pages from Media → WKE Comic.
          </p>
        </div>
      </div>
    );
  }

  return <ComicReader chapter={chapter} />;
}
