export type {
  ComicChapter,
  ComicChapterWithPages,
  ComicPage,
} from "@/lib/comic/types";
export {
  COMIC_ALLOWED_TYPES,
  COMIC_MAX_UPLOAD_BYTES,
  COMIC_MEDIA_BUCKET,
  DEFAULT_COMIC_CHAPTER_SLUG,
} from "@/lib/comic/types";
export { loadComicChapterBySlug } from "@/lib/comic/load-chapter";
