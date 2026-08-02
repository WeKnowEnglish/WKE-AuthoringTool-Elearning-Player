import "server-only";

import { createClient } from "@/lib/supabase/server";
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
};

function mapChapter(row: ChapterRow): ComicChapter {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    published: row.published,
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
  };
}

export async function loadComicChapterBySlug(
  slug: string = DEFAULT_COMIC_CHAPTER_SLUG,
): Promise<ComicChapterWithPages | null> {
  const supabase = await createClient();
  const { data: chapter, error } = await supabase
    .from("comic_chapters")
    .select("id, slug, title, subtitle, published")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !chapter) return null;

  const { data: pages, error: pagesError } = await supabase
    .from("comic_pages")
    .select(
      "id, chapter_id, page_index, public_url, original_filename, content_type",
    )
    .eq("chapter_id", chapter.id)
    .order("page_index", { ascending: true });

  if (pagesError) return null;

  return {
    ...mapChapter(chapter as ChapterRow),
    pages: ((pages ?? []) as PageRow[]).map(mapPage),
  };
}
