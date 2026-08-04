import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import type { ClassroomThemeId } from "@/lib/teacher-space/themes";

export type TeacherSpaceFormat = StudioActivityFormat;

export type TeacherSpaceRow = {
  id: string;
  teacher_id: string;
  handle: string;
  title: string;
  bio: string;
  is_published: boolean;
  hero_image_url: string | null;
  hero_asset_id: string | null;
  theme_id: ClassroomThemeId;
  created_at: string;
  updated_at: string;
};

export type TeacherSpaceSummary = {
  id: string;
  handle: string;
  title: string;
  bio: string;
  is_published: boolean;
  hero_image_url: string | null;
  theme_id: ClassroomThemeId;
  publicPath: string;
  updated_at: string;
  itemCount: number;
};

export type TeacherSpaceItemSummary = {
  id: string;
  space_id: string;
  studio_activity_id: string | null;
  format: TeacherSpaceFormat;
  title: string;
  caption: string;
  cover_image_url: string | null;
  sort_order: number;
  published_at: string;
  playPath: string;
};

export type TeacherSpaceItemDetail = TeacherSpaceItemSummary & {
  pack: unknown;
};

export type PublicTeacherSpacePage = {
  space: {
    handle: string;
    title: string;
    bio: string;
    hero_image_url: string | null;
    theme_id: ClassroomThemeId;
    trials_enabled?: boolean;
  };
  items: TeacherSpaceItemSummary[];
};
