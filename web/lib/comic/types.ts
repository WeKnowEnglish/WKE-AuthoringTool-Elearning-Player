export type ComicChapter = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  published: boolean;
};

export type ComicPage = {
  id: string;
  chapterId: string;
  pageIndex: number;
  publicUrl: string;
  originalFilename: string;
  contentType: string;
};

export type ComicChapterWithPages = ComicChapter & {
  pages: ComicPage[];
};

export const DEFAULT_COMIC_CHAPTER_SLUG = "chapter-1";
export const COMIC_MEDIA_BUCKET = "comic_media";
export const COMIC_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const COMIC_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
