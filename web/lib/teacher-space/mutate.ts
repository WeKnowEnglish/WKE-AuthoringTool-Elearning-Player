import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { extractCoverImageUrlFromPack } from "@/lib/teacher-space/extract-cover";
import { freezeStudioPackForSpace } from "@/lib/teacher-space/freeze";
import {
  assertValidTeacherSpaceHandle,
  suggestHandleFromEmail,
} from "@/lib/teacher-space/handle";
import { getTeacherSpaceForOwner } from "@/lib/teacher-space/load";
import { teacherSpacePublicPath } from "@/lib/teacher-space/paths";
import {
  isClassroomThemeId,
  type ClassroomThemeId,
} from "@/lib/teacher-space/themes";
import type { TeacherSpaceSummary } from "@/lib/teacher-space/types";

function migrationHint(message: string): string {
  if (/profile_image_url|profile_asset_id|activity_layout|wall_sections|section_id/i.test(message)) {
    return " Apply migration 132_teacher_space_sections_and_profile.sql.";
  }
  if (/teacher_space.*format_check|format_check/i.test(message)) {
    return " Apply migration 124_teacher_space_items_formats.sql (wall formats must match Activity Bank).";
  }
  if (/schema cache|does not exist/i.test(message) && /teacher_spaces|teacher_space_items/i.test(message)) {
    return " Apply migrations 072_teacher_spaces.sql and 073_teacher_space_branding.sql.";
  }
  return "";
}

function assertHttpsUrlOrNull(raw: string | null | undefined, label: string): string | null {
  const value = raw?.trim() || null;
  if (!value) return null;
  if (!/^https:\/\//i.test(value)) {
    throw new Error(`${label} must be an https URL.`);
  }
  if (value.length > 2000) {
    throw new Error(`${label} is too long.`);
  }
  return value;
}

async function uniqueHandle(
  supabase: SupabaseClient,
  preferred: string,
  excludeSpaceId?: string,
): Promise<string> {
  let base = preferred;
  for (let i = 0; i < 24; i += 1) {
    const candidate =
      i === 0 ? base : `${base.slice(0, 28)}-${i + 1}`.replace(/-+$/g, "").slice(0, 32);
    try {
      assertValidTeacherSpaceHandle(candidate);
    } catch {
      continue;
    }
    let query = supabase
      .from("teacher_spaces")
      .select("id")
      .eq("handle", candidate)
      .limit(1);
    if (excludeSpaceId) {
      query = query.neq("id", excludeSpaceId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`${error.message}${migrationHint(error.message)}`);
    }
    if (!data) return candidate;
  }
  return assertValidTeacherSpaceHandle(
    `t-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
  );
}

/** Ensure the teacher has a Space row; create with suggested handle if missing. */
export async function ensureTeacherSpace(
  supabase: SupabaseClient,
  teacherId: string,
  email?: string | null,
): Promise<TeacherSpaceSummary> {
  const existing = await getTeacherSpaceForOwner(supabase, teacherId);
  if (existing) return existing;

  const handle = await uniqueHandle(supabase, suggestHandleFromEmail(email));
  const title = "Classroom Wall";
  const { data, error } = await supabase
    .from("teacher_spaces")
    .insert({
      teacher_id: teacherId,
      handle,
      title,
      bio: "",
      is_published: false,
    })
    .select("id, handle, title, bio, is_published, updated_at")
    .single();

  if (error || !data) {
    // Race: another request created it
    const again = await getTeacherSpaceForOwner(supabase, teacherId);
    if (again) return again;
    throw new Error(
      `${error?.message ?? "Could not create Classroom Wall."}${migrationHint(error?.message ?? "")}`,
    );
  }

  const created = await getTeacherSpaceForOwner(supabase, teacherId);
  if (created) return created;
  return {
    id: data.id,
    handle: data.handle,
    title: data.title,
    bio: data.bio ?? "",
    is_published: Boolean(data.is_published),
    hero_image_url: null,
    profile_image_url: null,
    activity_layout: "cards",
    wall_sections: [{ id: "activities", label: "Activities" }],
    theme_id: "sky_day",
    publicPath: teacherSpacePublicPath(data.handle),
    updated_at: data.updated_at,
    itemCount: 0,
  };
}

export async function updateTeacherSpaceSettings(
  supabase: SupabaseClient,
  teacherId: string,
  input: {
    title: string;
    bio?: string;
    is_published: boolean;
    theme_id?: string;
    hero_image_url?: string | null;
    hero_asset_id?: string | null;
    profile_image_url?: string | null;
    profile_asset_id?: string | null;
    activity_layout?: "cards" | "compact";
    wall_sections?: Array<{ id: string; label: string }>;
    item_sections?: Record<string, string>;
    email?: string | null;
  },
): Promise<TeacherSpaceSummary> {
  // Handle/slug is assigned once on create and never changed.
  const space = await ensureTeacherSpace(supabase, teacherId, input.email);
  const title = input.title.trim();
  if (!title || title.length > 120) {
    throw new Error("Title is required (max 120 characters).");
  }
  const bio = (input.bio ?? "").trim();
  if (bio.length > 500) {
    throw new Error("Bio must be at most 500 characters.");
  }

  let themeId: ClassroomThemeId = space.theme_id;
  if (input.theme_id != null) {
    if (!isClassroomThemeId(input.theme_id)) {
      throw new Error("Invalid classroom theme.");
    }
    themeId = input.theme_id;
  }

  const heroImageUrl =
    input.hero_image_url === undefined
      ? space.hero_image_url
      : assertHttpsUrlOrNull(input.hero_image_url, "Hero image");
  const heroAssetId =
    input.hero_asset_id === undefined
      ? undefined
      : input.hero_asset_id?.trim() || null;
  const profileImageUrl =
    input.profile_image_url === undefined
      ? space.profile_image_url
      : assertHttpsUrlOrNull(input.profile_image_url, "Profile image");
  const profileAssetId =
    input.profile_asset_id === undefined ? undefined : input.profile_asset_id?.trim() || null;
  const activityLayout = input.activity_layout === "compact" ? "compact" : "cards";
  const sections = (input.wall_sections ?? space.wall_sections)
    .map((section) => ({
      id: section.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 48),
      label: section.label.trim().slice(0, 60),
    }))
    .filter((section, index, all) =>
      Boolean(section.id && section.label && all.findIndex((row) => row.id === section.id) === index),
    )
    .slice(0, 8);
  if (!sections.length) throw new Error("Keep at least one Classroom Wall section.");

  const patch: Record<string, unknown> = {
    title,
    bio,
    is_published: Boolean(input.is_published),
    theme_id: themeId,
    hero_image_url: heroImageUrl,
    profile_image_url: profileImageUrl,
    activity_layout: activityLayout,
    wall_sections: sections,
    updated_at: new Date().toISOString(),
  };
  if (heroAssetId !== undefined) {
    patch.hero_asset_id = heroAssetId;
  }
  if (profileAssetId !== undefined) patch.profile_asset_id = profileAssetId;

  const { error } = await supabase
    .from("teacher_spaces")
    .update(patch)
    .eq("id", space.id)
    .eq("teacher_id", teacherId);

  if (error) {
    throw new Error(`${error.message}${migrationHint(error.message)}`);
  }

  const validSectionIds = new Set(sections.map((section) => section.id));
  for (const [itemId, requestedSectionId] of Object.entries(input.item_sections ?? {})) {
    const sectionId = validSectionIds.has(requestedSectionId) ? requestedSectionId : sections[0]!.id;
    const { error: itemError } = await supabase
      .from("teacher_space_items")
      .update({ section_id: sectionId, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("space_id", space.id);
    if (itemError) throw new Error(itemError.message);
  }

  const next = await getTeacherSpaceForOwner(supabase, teacherId);
  if (!next) throw new Error("Classroom not found after update.");
  return next;
}

export async function publishActivityToTeacherSpace(
  supabase: SupabaseClient,
  teacherId: string,
  activityId: string,
  email?: string | null,
): Promise<{ itemId: string; space: TeacherSpaceSummary }> {
  const space = await ensureTeacherSpace(supabase, teacherId, email);

  const { data: activity, error: actErr } = await supabase
    .from("studio_activities")
    .select("id, format, title, pack, source")
    .eq("id", activityId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (actErr) {
    throw new Error(`${actErr.message}${migrationHint(actErr.message)}`);
  }
  if (!activity) {
    throw new Error("Activity not found in your Activity Bank.");
  }

  const frozen = freezeStudioPackForSpace(
    activity.format as Parameters<typeof freezeStudioPackForSpace>[0],
    activity.pack,
    activity.title,
  );
  const source = activity.source && typeof activity.source === "object" && !Array.isArray(activity.source)
    ? activity.source as Record<string, unknown>
    : {};
  const customCover = typeof source.coverImageUrl === "string" ? source.coverImageUrl.trim() : "";
  const coverImageUrl = customCover || extractCoverImageUrlFromPack(frozen.pack);

  const { data: existing } = await supabase
    .from("teacher_space_items")
    .select("id, sort_order")
    .eq("space_id", space.id)
    .eq("studio_activity_id", activityId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing?.id) {
    const { error } = await supabase
      .from("teacher_space_items")
      .update({
        format: frozen.format,
        title: frozen.title,
        pack: frozen.pack,
        cover_image_url: coverImageUrl,
        published_at: now,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) {
      throw new Error(`${error.message}${migrationHint(error.message)}`);
    }
    await supabase
      .from("teacher_spaces")
      .update({ updated_at: now })
      .eq("id", space.id);
    const next = await getTeacherSpaceForOwner(supabase, teacherId);
    return { itemId: existing.id, space: next ?? space };
  }

  const { data: maxRow } = await supabase
    .from("teacher_space_items")
    .select("sort_order")
    .eq("space_id", space.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (Number(maxRow?.sort_order) || 0) + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("teacher_space_items")
    .insert({
      space_id: space.id,
      studio_activity_id: activityId,
      format: frozen.format,
      title: frozen.title,
      caption: "",
      pack: frozen.pack,
      cover_image_url: coverImageUrl,
      sort_order: sortOrder,
      published_at: now,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    throw new Error(
      `${insErr?.message ?? "Could not publish to Classroom Wall."}${migrationHint(insErr?.message ?? "")}`,
    );
  }

  await supabase
    .from("teacher_spaces")
    .update({ updated_at: now })
    .eq("id", space.id);

  // Auto-publish Space on first item so the share link works immediately.
  if (!space.is_published) {
    await supabase
      .from("teacher_spaces")
      .update({ is_published: true, updated_at: now })
      .eq("id", space.id);
  }

  const next = await getTeacherSpaceForOwner(supabase, teacherId);
  return { itemId: inserted.id as string, space: next ?? space };
}

export async function unpublishSpaceItem(
  supabase: SupabaseClient,
  teacherId: string,
  itemId: string,
): Promise<void> {
  const space = await getTeacherSpaceForOwner(supabase, teacherId);
  if (!space) throw new Error("You do not have Classroom Wall set up yet.");

  const { error } = await supabase
    .from("teacher_space_items")
    .delete()
    .eq("id", itemId)
    .eq("space_id", space.id);

  if (error) {
    throw new Error(`${error.message}${migrationHint(error.message)}`);
  }

  await supabase
    .from("teacher_spaces")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", space.id);
}

export async function unpublishActivityFromSpace(
  supabase: SupabaseClient,
  teacherId: string,
  activityId: string,
): Promise<void> {
  const space = await getTeacherSpaceForOwner(supabase, teacherId);
  if (!space) return;

  const { error } = await supabase
    .from("teacher_space_items")
    .delete()
    .eq("space_id", space.id)
    .eq("studio_activity_id", activityId);

  if (error) {
    throw new Error(`${error.message}${migrationHint(error.message)}`);
  }
}

export async function reorderTeacherSpaceItems(
  supabase: SupabaseClient,
  teacherId: string,
  orderedItemIds: string[],
): Promise<void> {
  const space = await getTeacherSpaceForOwner(supabase, teacherId);
  if (!space) throw new Error("You do not have Classroom Wall set up yet.");

  const now = new Date().toISOString();
  for (let i = 0; i < orderedItemIds.length; i += 1) {
    const id = orderedItemIds[i]!;
    const { error } = await supabase
      .from("teacher_space_items")
      .update({ sort_order: i + 1, updated_at: now })
      .eq("id", id)
      .eq("space_id", space.id);
    if (error) {
      throw new Error(`${error.message}${migrationHint(error.message)}`);
    }
  }

  await supabase
    .from("teacher_spaces")
    .update({ updated_at: now })
    .eq("id", space.id);
}
