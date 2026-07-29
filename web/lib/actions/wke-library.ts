"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, isTeacher } from "@/lib/auth/roles";
import { requireTeacher } from "@/lib/actions/teacher";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { validateExploreHotspotsDocument } from "@/lib/hotspots/studio";
import { wkeActivityToExploreHotspotsPayload } from "@/lib/wke-activity/to-lesson-screen";
import { publishStudioActivity } from "@/lib/studio-activities/publish";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import type { User } from "@supabase/supabase-js";
import { WKE_LIBRARY_SEED_DEFINITIONS } from "@/lib/wke-library/seed-definitions";
import {
  mapWkeLibraryDetail,
  mapWkeLibrarySummary,
  slugifyLibraryTitle,
  WKE_LIBRARY_DETAIL_COLUMNS,
  WKE_LIBRARY_SUMMARY_COLUMNS,
} from "@/lib/wke-library/map-row";
import {
  WKE_LIBRARY_MAX_PENDING_PER_TEACHER,
  WKE_LIBRARY_MAX_SNAPSHOT_BYTES,
} from "@/lib/wke-library/limits";
import type { WkeLibraryItemDetail, WkeLibraryItemSummary } from "@/lib/wke-library/types";
import { getStudioActivityForTeacher } from "@/lib/studio-activities/load";
import { validateStudioActivityPack } from "@/lib/studio-activities/validate";
import { countLocalHotspotMedia } from "@/lib/hotspots/publish-media";
import { resolveExploreHotspotsMediaUrls } from "@/lib/hotspots/resolve-media-asset-urls";
import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user) || !isAdmin(user)) {
    throw new Error("Admin authentication required.");
  }
  return { supabase, user };
}

function editPathForFormat(format: StudioActivityFormat, activityId: string): string {
  if (format === "explore_hotspots") {
    return `/teacher/activity-builder/hotspots?activity=${encodeURIComponent(activityId)}`;
  }
  if (format === "vocabulary_list") {
    return `/teacher/activity-builder/vocabulary-lists?list=${encodeURIComponent(activityId)}`;
  }
  if (
    format === "multiple_choice" ||
    format === "letter_mixup" ||
    format === "flashcards"
  ) {
    return `/teacher/activity-builder/quizzes?activity=${encodeURIComponent(activityId)}`;
  }
  if (format === "learning_track") {
    return `/teacher/activity-builder/learning-tracks?activity=${encodeURIComponent(activityId)}`;
  }
  return "/teacher/activity-builder";
}

function cloneExploreAuthoring(authoring: unknown, title: string) {
  const document = validateExploreHotspotsDocument(authoring);
  const next = structuredClone(document);
  next.id = crypto.randomUUID();
  next.name = title;
  return next;
}

/** List published WKE Library items for teachers. */
export async function listPublishedWkeLibraryItems(input?: {
  format?: StudioActivityFormat;
  limit?: number;
}): Promise<WkeLibraryItemSummary[]> {
  const { supabase } = await requireTeacher();
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
  let query = supabase
    .from("wke_library_items")
    .select(WKE_LIBRARY_SUMMARY_COLUMNS)
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true })
    .limit(limit);
  if (input?.format) {
    query = query.eq("format", input.format);
  }
  const { data, error } = await query;
  if (error) {
    if (/wke_library_items|does not exist|PGRST/i.test(error.message)) {
      throw new Error(
        "WKE Library is not set up yet. Apply migration 082_wke_library_items.sql.",
      );
    }
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapWkeLibrarySummary(row as never));
}

export async function getPublishedWkeLibraryItem(
  idOrSlug: string,
): Promise<WkeLibraryItemDetail> {
  const { supabase } = await requireTeacher();
  const key = idOrSlug.trim();
  if (!key) throw new Error("Library item id is required.");

  const byId = await supabase
    .from("wke_library_items")
    .select(WKE_LIBRARY_DETAIL_COLUMNS)
    .eq("status", "published")
    .eq("id", key)
    .maybeSingle();
  if (byId.error) throw new Error(byId.error.message);
  if (byId.data) return mapWkeLibraryDetail(byId.data as never);

  const bySlug = await supabase
    .from("wke_library_items")
    .select(WKE_LIBRARY_DETAIL_COLUMNS)
    .eq("status", "published")
    .eq("slug", key)
    .maybeSingle();
  if (bySlug.error) throw new Error(bySlug.error.message);
  if (!bySlug.data) throw new Error("That WKE Library item was not found.");
  return mapWkeLibraryDetail(bySlug.data as never);
}

/**
 * Copy a published library item into the teacher's private Activity Bank.
 * Returns the new bank id + edit path.
 */
export async function forkWkeLibraryItemToBank(input: {
  libraryItemId: string;
}): Promise<{ activityId: string; title: string; editPath: string }> {
  const { supabase, user } = await requireTeacher();
  const item = await getPublishedWkeLibraryItem(input.libraryItemId);

  const result = await forkLibraryItemIntoBank({
    supabase,
    user,
    item,
    sourceVia: "wke_library_fork",
  });

  revalidatePath("/teacher/activity-builder");
  revalidatePath("/teacher/activity-builder/library");
  revalidatePath("/teacher/activity-builder/hotspots");

  return result;
}

/** Admin: upsert curated Phase 1 Hotspots starters into the catalog. */
export async function seedWkeLibraryFromFixtures(): Promise<{
  upserted: number;
  slugs: string[];
}> {
  const { user } = await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) {
    throw new Error("Service role is not configured; cannot seed WKE Library.");
  }

  const slugs: string[] = [];
  for (const def of WKE_LIBRARY_SEED_DEFINITIONS) {
    const built = await def.build();
    const now = new Date().toISOString();
    const { error } = await admin.from("wke_library_items").upsert(
      {
        slug: def.slug,
        format: def.format,
        title: def.title,
        description: def.description,
        cefr: def.cefr ?? null,
        tags: def.tags,
        status: "published",
        pack: built.pack,
        authoring: built.authoring,
        sort_order: def.sortOrder,
        source: {
          via: "fixture_seed",
          seededAt: now,
        },
        created_by: user.id,
        updated_by: user.id,
        updated_at: now,
      },
      { onConflict: "slug" },
    );
    if (error) {
      throw new Error(`Failed to seed “${def.slug}”: ${error.message}`);
    }
    slugs.push(def.slug);
  }

  revalidatePath("/teacher/activity-builder/library");
  return { upserted: slugs.length, slugs };
}

/** Admin helper: how many catalog rows exist (any status). */
export async function countWkeLibraryItems(): Promise<number> {
  await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) return 0;
  const { count, error } = await admin
    .from("wke_library_items")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function normalizeOptionalText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function assertSnapshotSize(pack: unknown, authoring: unknown | null) {
  const bytes = Buffer.byteLength(
    JSON.stringify({ pack, authoring }),
    "utf8",
  );
  if (bytes > WKE_LIBRARY_MAX_SNAPSHOT_BYTES) {
    throw new Error(
      `This activity is too large to submit (${Math.round(bytes / (1024 * 1024))} MB). Keep media in the shared library and re-save, then try again.`,
    );
  }
}

async function forkLibraryItemIntoBank(input: {
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"];
  user: User;
  item: WkeLibraryItemDetail;
  sourceVia: string;
  titlePrefix?: string;
}): Promise<{ activityId: string; title: string; editPath: string }> {
  let pack: unknown = input.item.pack;
  let authoring: unknown = input.item.authoring;
  const title = input.titlePrefix
    ? `${input.titlePrefix}${input.item.title}`.slice(0, 160)
    : input.item.title;

  if (input.item.format === "explore_hotspots") {
    if (!input.item.authoring) {
      throw new Error("This library item is missing authoring data.");
    }
    const cloned = cloneExploreAuthoring(input.item.authoring, title);
    authoring = cloned;
    pack = wkeActivityToExploreHotspotsPayload(cloned);
  }

  const published = await publishStudioActivity(input.supabase, input.user, {
    format: input.item.format,
    pack,
    authoring: authoring ?? undefined,
    title,
    filename: `${input.item.slug}.from-wke-library.json`,
    source: {
      via: input.sourceVia,
      libraryItemId: input.item.id,
      librarySlug: input.item.slug,
      libraryTitle: input.item.title,
      libraryStatus: input.item.status,
    },
  });

  return {
    activityId: published.id,
    title: published.title,
    editPath: editPathForFormat(input.item.format, published.id),
  };
}

/**
 * Snapshot a private Activity Bank item into the WKE Library review queue.
 * Does not publish — status stays `pending` until an admin approves.
 */
export async function submitStudioActivityToWkeLibrary(input: {
  studioActivityId: string;
  description?: string;
  creditName?: string;
  submitterNote?: string;
  cefr?: string;
  tags?: string[];
}): Promise<{ libraryItemId: string; title: string; status: "pending" }> {
  const { supabase, user } = await requireTeacher();
  const admin = createServiceRoleSupabase();
  if (!admin) {
    throw new Error("Service role is not configured; cannot submit to WKE Library.");
  }

  const activity = await getStudioActivityForTeacher(
    supabase,
    user.id,
    input.studioActivityId.trim(),
    { includePack: true },
  );
  if (!activity) {
    throw new Error("That Activity Bank item was not found.");
  }

  let pack = activity.pack;
  let authoring = activity.authoring;

  if (activity.format === "explore_hotspots") {
    if (!authoring) {
      throw new Error("Save this Hotspots activity to Activity Bank before submitting.");
    }
    let document = validateExploreHotspotsDocument(authoring) as ExploreHotspotsDocument;
    if (countLocalHotspotMedia(document) > 0) {
      throw new Error(
        "This activity still has local images. Save to Activity Bank first, then submit.",
      );
    }
    document = validateExploreHotspotsDocument(
      await resolveExploreHotspotsMediaUrls(document),
    ) as ExploreHotspotsDocument;
    authoring = document as unknown as Record<string, unknown>;
    pack = wkeActivityToExploreHotspotsPayload(document);
  }

  const validated = validateStudioActivityPack(
    activity.format,
    pack,
    authoring ?? undefined,
  );

  const creditName = normalizeOptionalText(input.creditName, 80);
  const submitterNote = normalizeOptionalText(input.submitterNote, 500);
  const description =
    normalizeOptionalText(input.description, 800) ||
    `Teacher contribution: ${activity.title}`;
  const cefr = normalizeOptionalText(input.cefr, 16);
  const tags = (input.tags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  const { data: existingPending } = await admin
    .from("wke_library_items")
    .select("id,title")
    .eq("submitted_from_studio_activity_id", activity.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existingPending) {
    throw new Error(
      `“${existingPending.title}” is already waiting for review. An admin will publish or reject it soon.`,
    );
  }

  const { count: pendingCount, error: pendingCountError } = await admin
    .from("wke_library_items")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id)
    .eq("status", "pending");
  if (pendingCountError) throw new Error(pendingCountError.message);
  if ((pendingCount ?? 0) >= WKE_LIBRARY_MAX_PENDING_PER_TEACHER) {
    throw new Error(
      `You already have ${WKE_LIBRARY_MAX_PENDING_PER_TEACHER} activities waiting for review. Withdraw one or wait for a decision before submitting more.`,
    );
  }

  assertSnapshotSize(validated.pack, validated.authoring);

  const suffix = crypto.randomUUID().slice(0, 8);
  const slug = `${slugifyLibraryTitle(activity.title)}-${suffix}`;
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("wke_library_items")
    .insert({
      slug,
      format: activity.format,
      title: activity.title.slice(0, 160),
      description,
      cefr,
      tags,
      status: "pending",
      pack: validated.pack,
      authoring: validated.authoring,
      sort_order: 500,
      credit_name: creditName,
      submitter_note: submitterNote,
      submitted_from_studio_activity_id: activity.id,
      source: {
        via: "teacher_submission",
        studioActivityId: activity.id,
        submittedAt: now,
      },
      created_by: user.id,
      updated_by: user.id,
      updated_at: now,
    })
    .select("id,title")
    .single();

  if (error) {
    if (/wke_library_items|pending|column|PGRST/i.test(error.message)) {
      throw new Error(
        `${error.message} Apply migration 084_wke_library_submissions.sql if needed.`,
      );
    }
    throw new Error(error.message);
  }

  revalidatePath("/teacher/activity-builder/library");
  revalidatePath("/teacher/admin/wke-library");
  return {
    libraryItemId: data.id as string,
    title: data.title as string,
    status: "pending",
  };
}

/** Teacher: list own submissions (pending / rejected / published). */
export async function listMyWkeLibrarySubmissions(): Promise<WkeLibraryItemSummary[]> {
  const { supabase, user } = await requireTeacher();
  const { data, error } = await supabase
    .from("wke_library_items")
    .select(WKE_LIBRARY_SUMMARY_COLUMNS)
    .eq("created_by", user.id)
    .in("status", ["pending", "rejected", "published"])
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapWkeLibrarySummary(row as never));
}

/** Admin: pending review queue. */
export async function listPendingWkeLibrarySubmissions(): Promise<WkeLibraryItemSummary[]> {
  await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) throw new Error("Service role is not configured.");
  const { data, error } = await admin
    .from("wke_library_items")
    .select(WKE_LIBRARY_SUMMARY_COLUMNS)
    .eq("status", "pending")
    .order("updated_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapWkeLibrarySummary(row as never));
}

export async function countPendingWkeLibrarySubmissions(): Promise<number> {
  await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) return 0;
  const { count, error } = await admin
    .from("wke_library_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getWkeLibraryItemForAdmin(
  libraryItemId: string,
): Promise<WkeLibraryItemDetail> {
  await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) throw new Error("Service role is not configured.");
  const { data, error } = await admin
    .from("wke_library_items")
    .select(WKE_LIBRARY_DETAIL_COLUMNS)
    .eq("id", libraryItemId.trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Library item not found.");
  return mapWkeLibraryDetail(data as never);
}

/** Admin: publish a pending (or draft) submission. */
export async function approveWkeLibrarySubmission(input: {
  libraryItemId: string;
  reviewNote?: string;
  title?: string;
  description?: string;
  cefr?: string;
  tags?: string[];
  sortOrder?: number;
}): Promise<{ id: string; title: string }> {
  const { user } = await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) throw new Error("Service role is not configured.");

  const existing = await getWkeLibraryItemForAdmin(input.libraryItemId);
  if (existing.status !== "pending" && existing.status !== "draft") {
    throw new Error("Only pending or draft items can be approved.");
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: "published",
    reviewed_by: user.id,
    reviewed_at: now,
    review_note: normalizeOptionalText(input.reviewNote, 500),
    updated_by: user.id,
    updated_at: now,
  };
  if (input.title?.trim()) patch.title = input.title.trim().slice(0, 160);
  if (input.description != null) {
    patch.description = normalizeOptionalText(input.description, 800) ?? "";
  }
  if (input.cefr !== undefined) patch.cefr = normalizeOptionalText(input.cefr, 16);
  if (input.tags) {
    patch.tags = input.tags
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)) {
    patch.sort_order = Math.round(input.sortOrder);
  }

  const { data, error } = await admin
    .from("wke_library_items")
    .update(patch)
    .eq("id", existing.id)
    .select("id,title")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/activity-builder/library");
  revalidatePath("/teacher/admin/wke-library");
  return { id: data.id as string, title: data.title as string };
}

/** Admin: reject a pending submission. */
export async function rejectWkeLibrarySubmission(input: {
  libraryItemId: string;
  reviewNote?: string;
}): Promise<{ id: string; title: string }> {
  const { user } = await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) throw new Error("Service role is not configured.");

  const existing = await getWkeLibraryItemForAdmin(input.libraryItemId);
  if (existing.status !== "pending") {
    throw new Error("Only pending items can be rejected.");
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("wke_library_items")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: now,
      review_note: normalizeOptionalText(input.reviewNote, 500),
      updated_by: user.id,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("id,title")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/activity-builder/library");
  revalidatePath("/teacher/admin/wke-library");
  return { id: data.id as string, title: data.title as string };
}

/** Teacher: cancel own pending submission (removes the queue row). */
export async function withdrawWkeLibrarySubmission(input: {
  libraryItemId: string;
}): Promise<{ id: string; title: string }> {
  const { user } = await requireTeacher();
  const admin = createServiceRoleSupabase();
  if (!admin) throw new Error("Service role is not configured.");

  const { data: existing, error: loadError } = await admin
    .from("wke_library_items")
    .select("id,title,status,created_by")
    .eq("id", input.libraryItemId.trim())
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!existing) throw new Error("Submission not found.");
  if (existing.created_by !== user.id) {
    throw new Error("You can only withdraw your own submissions.");
  }
  if (existing.status !== "pending") {
    throw new Error("Only pending submissions can be withdrawn.");
  }

  const { error } = await admin.from("wke_library_items").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/activity-builder/library");
  revalidatePath("/teacher/admin/wke-library");
  return { id: existing.id as string, title: existing.title as string };
}

/**
 * Admin: open a private preview copy in Activity Bank (works for pending or published).
 * Does not change catalog status.
 */
export async function previewWkeLibraryItemInBank(input: {
  libraryItemId: string;
}): Promise<{ activityId: string; title: string; editPath: string }> {
  const { supabase, user } = await requireAdminUser();
  const item = await getWkeLibraryItemForAdmin(input.libraryItemId);
  if (!item.authoring && item.format === "explore_hotspots") {
    throw new Error("This item has no authoring snapshot to preview.");
  }

  const result = await forkLibraryItemIntoBank({
    supabase,
    user,
    item,
    sourceVia: "wke_library_admin_preview",
    titlePrefix: "[Preview] ",
  });

  revalidatePath("/teacher/activity-builder/hotspots");
  return result;
}

/** Admin: hide a published item from the public catalog. */
export async function retireWkeLibraryItem(input: {
  libraryItemId: string;
  reviewNote?: string;
}): Promise<{ id: string; title: string }> {
  const { user } = await requireAdminUser();
  const admin = createServiceRoleSupabase();
  if (!admin) throw new Error("Service role is not configured.");

  const existing = await getWkeLibraryItemForAdmin(input.libraryItemId);
  if (existing.status !== "published") {
    throw new Error("Only published items can be retired.");
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("wke_library_items")
    .update({
      status: "retired",
      reviewed_by: user.id,
      reviewed_at: now,
      review_note: normalizeOptionalText(input.reviewNote, 500),
      updated_by: user.id,
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("id,title")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/teacher/activity-builder/library");
  revalidatePath("/teacher/admin/wke-library");
  return { id: data.id as string, title: data.title as string };
}
