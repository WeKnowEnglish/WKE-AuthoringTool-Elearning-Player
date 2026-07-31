export type ClassPostKind =
  | "announcement"
  | "photo"
  | "link"
  | "homework_reminder"
  | "activity";

export type ClassPost = {
  id: string;
  classId: string;
  teacherId: string;
  kind: ClassPostKind;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkTitle: string | null;
  homeworkId: string | null;
  activitySpaceItemId: string | null;
  activityTitle: string | null;
  activityPlayPath: string | null;
  pinnedAt: string | null;
  publishedAt: string;
  createdAt: string;
};

export function sortClassPostsForFeed(posts: ClassPost[]): ClassPost[] {
  return [...posts].sort((a, b) => {
    const aPinned = a.pinnedAt ? 1 : 0;
    const bPinned = b.pinnedAt ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    if (a.pinnedAt && b.pinnedAt && a.pinnedAt !== b.pinnedAt) {
      return b.pinnedAt.localeCompare(a.pinnedAt);
    }
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}
