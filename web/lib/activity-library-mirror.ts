/** Lessons created by "Edit in course editor" for an activity use slug `activity-{uuid}`. */
const ACTIVITY_LESSON_SLUG_RE = /^activity-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function parseActivityLibraryIdFromLessonSlug(slug: string | null | undefined): string | null {
  if (!slug || typeof slug !== "string") return null;
  const m = slug.trim().match(ACTIVITY_LESSON_SLUG_RE);
  return m?.[1]?.toLowerCase() ?? null;
}
