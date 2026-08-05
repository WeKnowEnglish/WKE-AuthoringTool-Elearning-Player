import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import {
  teacherSpacePlayPath,
  teacherSpacePublicPath,
} from "@/lib/teacher-space/paths";
import { resolveClassroomTheme } from "@/lib/teacher-space/themes";
import type {
  PublicTeacherSpacePage,
  TeacherSpaceItemDetail,
  TeacherSpaceItemSummary,
  TeacherSpaceSummary,
} from "@/lib/teacher-space/types";

function migrationHint(message: string): string {
  if (/teacher_space.*format_check|format_check/i.test(message)) {
    return " Apply migration 124_teacher_space_items_formats.sql (wall formats must match Activity Bank).";
  }
  if (/schema cache|does not exist/i.test(message) && /teacher_spaces|teacher_space_items/i.test(message)) {
    return " Apply migrations 072_teacher_spaces.sql and 073_teacher_space_branding.sql.";
  }
  return "";
}

function mapItemSummary(
  row: {
    id: string;
    space_id: string;
    studio_activity_id: string | null;
    format: string;
    title: string;
    caption: string;
    cover_image_url?: string | null;
    sort_order: number;
    published_at: string;
  },
  handle: string,
): TeacherSpaceItemSummary {
  return {
    id: row.id,
    space_id: row.space_id,
    studio_activity_id: row.studio_activity_id,
    format: row.format as StudioActivityFormat,
    title: row.title,
    caption: row.caption ?? "",
    cover_image_url: row.cover_image_url ?? null,
    sort_order: row.sort_order,
    published_at: row.published_at,
    playPath: teacherSpacePlayPath(handle, row.id),
  };
}

function mapSpaceSummary(
  data: {
    id: string;
    handle: string;
    title: string;
    bio: string | null;
    is_published: boolean;
    hero_image_url?: string | null;
    theme_id?: string | null;
    updated_at: string;
  },
  itemCount: number,
): TeacherSpaceSummary {
  const theme = resolveClassroomTheme(data.theme_id);
  return {
    id: data.id,
    handle: data.handle,
    title: data.title,
    bio: data.bio ?? "",
    is_published: Boolean(data.is_published),
    hero_image_url: data.hero_image_url ?? null,
    theme_id: theme.id,
    publicPath: teacherSpacePublicPath(data.handle),
    updated_at: data.updated_at,
    itemCount,
  };
}

const SPACE_SELECT =
  "id, handle, title, bio, is_published, hero_image_url, theme_id, updated_at";
const ITEM_SELECT =
  "id, space_id, studio_activity_id, format, title, caption, cover_image_url, sort_order, published_at";

export async function getTeacherSpaceForOwner(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<TeacherSpaceSummary | null> {
  const { data, error } = await supabase
    .from("teacher_spaces")
    .select(SPACE_SELECT)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) {
    throw new Error(`${error.message}${migrationHint(error.message)}`);
  }
  if (!data) return null;

  const { count, error: countErr } = await supabase
    .from("teacher_space_items")
    .select("id", { count: "exact", head: true })
    .eq("space_id", data.id);
  if (countErr) {
    throw new Error(`${countErr.message}${migrationHint(countErr.message)}`);
  }

  return mapSpaceSummary(data, count ?? 0);
}

export async function listTeacherSpaceItemsForOwner(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<TeacherSpaceItemSummary[]> {
  const space = await getTeacherSpaceForOwner(supabase, teacherId);
  if (!space) return [];

  const { data, error } = await supabase
    .from("teacher_space_items")
    .select(ITEM_SELECT)
    .eq("space_id", space.id)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`${error.message}${migrationHint(error.message)}`);
  }

  return (data ?? []).map((row) =>
    mapItemSummary(row as Parameters<typeof mapItemSummary>[0], space.handle),
  );
}

/** Map bank activity id → space item id for the teacher's Space. */
export async function mapSpaceItemIdsByActivity(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<Record<string, string>> {
  const items = await listTeacherSpaceItemsForOwner(supabase, teacherId);
  const map: Record<string, string> = {};
  for (const item of items) {
    if (item.studio_activity_id) {
      map[item.studio_activity_id] = item.id;
    }
  }
  return map;
}

export async function getPublishedTeacherSpaceByHandle(
  supabase: SupabaseClient,
  handle: string,
): Promise<PublicTeacherSpacePage | null> {
  const { data: space, error } = await supabase
    .from("teacher_spaces")
    .select("id, handle, title, bio, is_published, hero_image_url, theme_id, trials_enabled")
    .eq("handle", handle)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    // Pre-migration 115: column missing — fall back without trials flag.
    if (/trials_enabled/i.test(error.message)) {
      const { data: legacy, error: legacyError } = await supabase
        .from("teacher_spaces")
        .select("id, handle, title, bio, is_published, hero_image_url, theme_id")
        .eq("handle", handle)
        .eq("is_published", true)
        .maybeSingle();
      if (legacyError) {
        throw new Error(`${legacyError.message}${migrationHint(legacyError.message)}`);
      }
      if (!legacy) return null;
      const theme = resolveClassroomTheme(legacy.theme_id);
      const { data: items, error: itemsErr } = await supabase
        .from("teacher_space_items")
        .select(ITEM_SELECT)
        .eq("space_id", legacy.id)
        .order("sort_order", { ascending: true })
        .order("published_at", { ascending: false });
      if (itemsErr) {
        throw new Error(`${itemsErr.message}${migrationHint(itemsErr.message)}`);
      }
      return {
        space: {
          handle: legacy.handle,
          title: legacy.title,
          bio: legacy.bio ?? "",
          hero_image_url: legacy.hero_image_url ?? null,
          theme_id: theme.id,
          trials_enabled: false,
        },
        items: (items ?? []).map((row) =>
          mapItemSummary(row as Parameters<typeof mapItemSummary>[0], legacy.handle),
        ),
      };
    }
    throw new Error(`${error.message}${migrationHint(error.message)}`);
  }
  if (!space) return null;

  const theme = resolveClassroomTheme(space.theme_id);

  const { data: items, error: itemsErr } = await supabase
    .from("teacher_space_items")
    .select(ITEM_SELECT)
    .eq("space_id", space.id)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (itemsErr) {
    throw new Error(`${itemsErr.message}${migrationHint(itemsErr.message)}`);
  }

  return {
    space: {
      handle: space.handle,
      title: space.title,
      bio: space.bio ?? "",
      hero_image_url: space.hero_image_url ?? null,
      theme_id: theme.id,
      trials_enabled: Boolean(
        (space as { trials_enabled?: boolean }).trials_enabled,
      ),
    },
    items: (items ?? []).map((row) =>
      mapItemSummary(row as Parameters<typeof mapItemSummary>[0], space.handle),
    ),
  };
}

export async function getPublishedSpaceItem(
  supabase: SupabaseClient,
  handle: string,
  itemId: string,
): Promise<(TeacherSpaceItemDetail & { theme_id: string; spaceTitle: string }) | null> {
  const { data: space, error: spaceErr } = await supabase
    .from("teacher_spaces")
    .select("id, handle, title, is_published, theme_id")
    .eq("handle", handle)
    .eq("is_published", true)
    .maybeSingle();

  if (spaceErr) {
    throw new Error(`${spaceErr.message}${migrationHint(spaceErr.message)}`);
  }
  if (!space) return null;

  const { data, error } = await supabase
    .from("teacher_space_items")
    .select(`${ITEM_SELECT}, pack`)
    .eq("space_id", space.id)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error(`${error.message}${migrationHint(error.message)}`);
  }
  if (!data) return null;

  const summary = mapItemSummary(
    data as Parameters<typeof mapItemSummary>[0],
    space.handle,
  );
  return {
    ...summary,
    pack: data.pack,
    theme_id: resolveClassroomTheme(space.theme_id).id,
    spaceTitle: space.title,
  };
}
