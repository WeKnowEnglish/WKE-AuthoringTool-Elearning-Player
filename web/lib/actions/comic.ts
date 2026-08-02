"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminContext } from "@/lib/admin/admin-context";
import { loadComicChapterBySlug } from "@/lib/comic/load-chapter";
import {
  COMIC_ALLOWED_TYPES,
  COMIC_MAX_UPLOAD_BYTES,
  COMIC_MEDIA_BUCKET,
  DEFAULT_COMIC_CHAPTER_SLUG,
  type ComicChapterWithPages,
} from "@/lib/comic/types";

export type ComicActionResult =
  | { ok: true; chapter: ComicChapterWithPages }
  | { ok: false; error: string };

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "page";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "page";
}

function revalidateComicPaths(slug: string) {
  revalidatePath("/wke/comic");
  revalidatePath("/teacher/media/comic");
  revalidatePath(`/wke/comic?chapter=${encodeURIComponent(slug)}`);
}

async function loadAdminChapter(
  service: SupabaseClient,
  slug: string,
): Promise<ComicChapterWithPages | null> {
  const { data: chapter, error } = await service
    .from("comic_chapters")
    .select("id, slug, title, subtitle, published")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !chapter) return null;

  const { data: pages } = await service
    .from("comic_pages")
    .select(
      "id, chapter_id, page_index, public_url, original_filename, content_type",
    )
    .eq("chapter_id", chapter.id)
    .order("page_index", { ascending: true });

  return {
    id: chapter.id as string,
    slug: chapter.slug as string,
    title: chapter.title as string,
    subtitle: (chapter.subtitle as string | null) ?? null,
    published: Boolean(chapter.published),
    pages: (pages ?? []).map((row) => ({
      id: row.id as string,
      chapterId: row.chapter_id as string,
      pageIndex: row.page_index as number,
      publicUrl: row.public_url as string,
      originalFilename: row.original_filename as string,
      contentType: row.content_type as string,
    })),
  };
}

export async function getComicChapterForAdmin(
  slug: string = DEFAULT_COMIC_CHAPTER_SLUG,
): Promise<ComicActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };
  const chapter = await loadAdminChapter(gate.ctx.service, slug);
  if (!chapter) return { ok: false, error: "Comic chapter not found. Apply migration 098." };
  return { ok: true, chapter };
}

export async function uploadComicPages(formData: FormData): Promise<ComicActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };
  const { service, userId } = gate.ctx;

  const slug =
    (typeof formData.get("slug") === "string" && formData.get("slug")?.toString().trim()) ||
    DEFAULT_COMIC_CHAPTER_SLUG;

  const chapter = await loadAdminChapter(service, slug);
  if (!chapter) return { ok: false, error: "Comic chapter not found. Apply migration 098." };

  const files = formData
    .getAll("pages")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { ok: false, error: "Choose one or more page images to upload." };
  }

  let nextIndex =
    chapter.pages.reduce((max, page) => Math.max(max, page.pageIndex), 0) + 1;

  for (const file of files) {
    if (!COMIC_ALLOWED_TYPES.has(file.type)) {
      return {
        ok: false,
        error: `"${file.name}" must be JPEG, PNG, WebP, or GIF.`,
      };
    }
    if (file.size > COMIC_MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" is too large (max 15 MB).`,
      };
    }

    const pageId = crypto.randomUUID();
    const filename = sanitizeFilename(file.name);
    const storagePath = `${chapter.id}/${pageId}/${filename}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await service.storage
      .from(COMIC_MEDIA_BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      return { ok: false, error: uploadError.message || "Upload failed." };
    }

    const { data: publicData } = service.storage
      .from(COMIC_MEDIA_BUCKET)
      .getPublicUrl(storagePath);

    const { error: insertError } = await service.from("comic_pages").insert({
      id: pageId,
      chapter_id: chapter.id,
      page_index: nextIndex,
      storage_path: storagePath,
      public_url: publicData.publicUrl,
      original_filename: filename,
      content_type: file.type,
      uploaded_by: userId,
    });
    if (insertError) {
      await service.storage.from(COMIC_MEDIA_BUCKET).remove([storagePath]);
      return { ok: false, error: insertError.message || "Could not save page." };
    }
    nextIndex += 1;
  }

  await service
    .from("comic_chapters")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chapter.id);

  revalidateComicPaths(slug);
  const refreshed = await loadAdminChapter(service, slug);
  if (!refreshed) return { ok: false, error: "Uploaded, but could not reload chapter." };
  return { ok: true, chapter: refreshed };
}

export async function deleteComicPage(input: {
  pageId: string;
  slug?: string;
}): Promise<ComicActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };
  const { service } = gate.ctx;
  const slug = input.slug?.trim() || DEFAULT_COMIC_CHAPTER_SLUG;

  const { data: page, error } = await service
    .from("comic_pages")
    .select("id, chapter_id, storage_path, page_index")
    .eq("id", input.pageId)
    .maybeSingle();
  if (error || !page) return { ok: false, error: "Page not found." };

  await service.storage.from(COMIC_MEDIA_BUCKET).remove([page.storage_path as string]);
  const { error: deleteError } = await service
    .from("comic_pages")
    .delete()
    .eq("id", input.pageId);
  if (deleteError) return { ok: false, error: deleteError.message };

  const { data: remaining } = await service
    .from("comic_pages")
    .select("id, page_index")
    .eq("chapter_id", page.chapter_id)
    .order("page_index", { ascending: true });

  // Compact page indexes after delete.
  for (let i = 0; i < (remaining ?? []).length; i += 1) {
    const row = remaining![i]!;
    const desired = i + 1;
    if (row.page_index !== desired) {
      await service
        .from("comic_pages")
        .update({ page_index: desired })
        .eq("id", row.id);
    }
  }

  await service
    .from("comic_chapters")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", page.chapter_id);

  revalidateComicPaths(slug);
  const refreshed = await loadAdminChapter(service, slug);
  if (!refreshed) return { ok: false, error: "Deleted, but could not reload chapter." };
  return { ok: true, chapter: refreshed };
}

/**
 * Persist a new reading order. Uses a two-phase index update to avoid
 * colliding with the unique (chapter_id, page_index) constraint.
 */
export async function reorderComicPages(input: {
  orderedPageIds: string[];
  slug?: string;
}): Promise<ComicActionResult> {
  const gate = await requireAdminContext();
  if (!gate.ok) return { ok: false, error: gate.error };
  const { service } = gate.ctx;
  const slug = input.slug?.trim() || DEFAULT_COMIC_CHAPTER_SLUG;

  const chapter = await loadAdminChapter(service, slug);
  if (!chapter) return { ok: false, error: "Comic chapter not found." };

  const orderedPageIds = input.orderedPageIds.map((id) => id.trim()).filter(Boolean);
  if (orderedPageIds.length === 0) {
    return { ok: false, error: "No pages to reorder." };
  }

  const existingIds = new Set(chapter.pages.map((page) => page.id));
  if (
    orderedPageIds.length !== chapter.pages.length ||
    orderedPageIds.some((id) => !existingIds.has(id))
  ) {
    return {
      ok: false,
      error: "Page list is out of date. Refresh and try again.",
    };
  }

  // Phase 1: park indexes above any real page number (check constraint is >= 1).
  const tempBase = 100_000;
  for (let i = 0; i < orderedPageIds.length; i += 1) {
    const { error } = await service
      .from("comic_pages")
      .update({ page_index: tempBase + i + 1 })
      .eq("id", orderedPageIds[i]!)
      .eq("chapter_id", chapter.id);
    if (error) return { ok: false, error: error.message || "Could not reorder pages." };
  }

  // Phase 2: write final 1..n order.
  for (let i = 0; i < orderedPageIds.length; i += 1) {
    const { error } = await service
      .from("comic_pages")
      .update({ page_index: i + 1 })
      .eq("id", orderedPageIds[i]!)
      .eq("chapter_id", chapter.id);
    if (error) return { ok: false, error: error.message || "Could not reorder pages." };
  }

  await service
    .from("comic_chapters")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chapter.id);

  revalidateComicPaths(slug);
  const refreshed = await loadAdminChapter(service, slug);
  if (!refreshed) return { ok: false, error: "Reordered, but could not reload chapter." };
  return { ok: true, chapter: refreshed };
}

export async function getPublishedComicChapter(
  slug: string = DEFAULT_COMIC_CHAPTER_SLUG,
): Promise<ComicChapterWithPages | null> {
  return loadComicChapterBySlug(slug);
}
