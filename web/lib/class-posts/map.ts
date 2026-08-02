import {
  normalizeClassPostActivityPlayPath,
  normalizeClassPostActivitySpaceItemId,
  normalizeClassPostActivityTitle,
  normalizeClassPostBody,
  normalizeClassPostHomeworkId,
  normalizeClassPostGuardianVisibility,
  normalizeClassPostImageUrl,
  normalizeClassPostKind,
  normalizeClassPostLinkTitle,
  normalizeClassPostLinkUrl,
  normalizeClassPostPinnedAt,
} from "@/lib/class-posts/normalize";
import type { ClassPost } from "@/lib/class-posts/types";

export type ClassPostRow = {
  id: string;
  class_id: string;
  teacher_id: string;
  kind: string;
  body: string;
  image_url: string | null;
  link_url?: string | null;
  link_title?: string | null;
  homework_id?: string | null;
  activity_space_item_id?: string | null;
  activity_title?: string | null;
  activity_play_path?: string | null;
  pinned_at?: string | null;
  guardian_visibility?: string | null;
  published_at: string;
  created_at: string;
};

export function mapClassPostRow(row: ClassPostRow): ClassPost | null {
  const kind = normalizeClassPostKind(row.kind);
  if (!kind) return null;
  return {
    id: row.id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    kind,
    body: normalizeClassPostBody(row.body),
    imageUrl: normalizeClassPostImageUrl(row.image_url),
    linkUrl: normalizeClassPostLinkUrl(row.link_url),
    linkTitle: normalizeClassPostLinkTitle(row.link_title),
    homeworkId: normalizeClassPostHomeworkId(row.homework_id),
    activitySpaceItemId: normalizeClassPostActivitySpaceItemId(
      row.activity_space_item_id,
    ),
    activityTitle: normalizeClassPostActivityTitle(row.activity_title),
    activityPlayPath: normalizeClassPostActivityPlayPath(row.activity_play_path),
    pinnedAt: normalizeClassPostPinnedAt(row.pinned_at),
    guardianVisibility: normalizeClassPostGuardianVisibility(row.guardian_visibility),
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}
