import "server-only";

import { chapterOneEditablePackage } from "@/content/comics/chapter-1";
import { chapterTwoEditablePackage } from "@/content/comics/chapter-2";
import { createClient } from "@/lib/supabase/server";
import { parseComicPageOverlay } from "@/lib/comic/overlay";
import {
  DEFAULT_COMIC_CHAPTER_SLUG,
  type ComicChapter,
  type ComicChapterWithPages,
  type ComicPage,
} from "@/lib/comic/types";

type ChapterRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  published: boolean;
};

type PageRow = {
  id: string;
  chapter_id: string;
  page_index: number;
  public_url: string;
  original_filename: string;
  content_type: string;
  image_width: number | null;
  image_height: number | null;
  overlay_data: unknown;
};

function bundledChapter(slug: string): ComicChapterWithPages | null {
  if (slug === chapterOneEditablePackage.slug) return chapterOneEditablePackage;
  if (slug === chapterTwoEditablePackage.slug) return chapterTwoEditablePackage;
  return null;
}

function mapChapter(row: ChapterRow): ComicChapter {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    published: row.published,
    source: "database",
  };
}

function mapPage(row: PageRow): ComicPage {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    pageIndex: row.page_index,
    publicUrl: row.public_url,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    overlay: parseComicPageOverlay(row.overlay_data),
  };
}

export async function loadComicChapterBySlug(
  slug: string = DEFAULT_COMIC_CHAPTER_SLUG,
): Promise<ComicChapterWithPages | null> {
  const fallback = bundledChapter(slug);
  const supabase = await createClient();
  const { data: chapter, error } = await supabase
    .from("comic_chapters")
    .select("id, slug, title, subtitle, published")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !chapter) {
    return fallback;
  }

  const { data: pages, error: pagesError } = await supabase
    .from("comic_pages")
    .select(
      "id, chapter_id, page_index, public_url, original_filename, content_type, image_width, image_height, overlay_data",
    )
    .eq("chapter_id", chapter.id)
    .order("page_index", { ascending: true });

  if (pagesError) {
    return fallback;
  }

  const mappedPages = ((pages ?? []) as PageRow[]).map(mapPage);

  // Until a bundled editable package is installed in Supabase, serve its
  // clean-art fallback so students never see duplicate baked lettering.
  if (
    fallback &&
    (mappedPages.length === 0 || mappedPages.every((page) => page.overlay === null))
  ) {
    return fallback;
  }

  return {
    ...mapChapter(chapter as ChapterRow),
    pages: mappedPages,
  };
}
