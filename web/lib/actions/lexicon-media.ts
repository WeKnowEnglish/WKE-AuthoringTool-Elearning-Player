"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/actions/teacher";
import type { VocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/types";
import {
  applyLexiconMediaPreferences,
  type LexiconMediaPreference,
} from "@/lib/vocabulary/lexicon-media/apply-to-vocab-list";
import type {
  LexiconMediaLinkRow,
  LexiconMediaRole,
} from "@/lib/vocabulary/lexicon-media/types";

const ROLES = new Set<LexiconMediaRole>([
  "illustration",
  "pronunciation",
  "scene",
  "other",
]);

function normalizeLexiconId(raw: string): string | null {
  const id = raw.trim();
  if (id.length < 2 || id.length > 80) return null;
  return id;
}

function normalizeSurface(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, 120) : null;
}

function ensureRole(raw: string | undefined): LexiconMediaRole {
  if (raw && ROLES.has(raw as LexiconMediaRole)) return raw as LexiconMediaRole;
  return "illustration";
}

function mapJoinedRow(row: {
  id: string;
  lexicon_id: string;
  media_asset_id: string;
  role: string;
  created_by: string;
  created_at: string;
  media_assets:
    | {
        public_url: string;
        content_type: string;
        original_filename: string;
        meta_item_name: string | null;
      }
    | {
        public_url: string;
        content_type: string;
        original_filename: string;
        meta_item_name: string | null;
      }[]
    | null;
}): LexiconMediaLinkRow | null {
  const media = Array.isArray(row.media_assets)
    ? row.media_assets[0]
    : row.media_assets;
  if (!media?.public_url) return null;
  return {
    id: row.id,
    lexiconId: row.lexicon_id,
    mediaAssetId: row.media_asset_id,
    role: ensureRole(row.role),
    createdBy: row.created_by,
    createdAt: row.created_at,
    publicUrl: media.public_url,
    contentType: media.content_type,
    originalFilename: media.original_filename,
    itemName: media.meta_item_name,
  };
}

/**
 * Link a media_assets row to a lexicon id. Soft-enriches empty item name / alt names
 * with the surface form when the caller owns the asset.
 */
export async function linkLexiconMedia(input: {
  lexiconId: string;
  mediaAssetId: string;
  role?: LexiconMediaRole;
  surface?: string | null;
}): Promise<{ ok: true; linkId: string } | { ok: false; error: string }> {
  const lexiconId = normalizeLexiconId(input.lexiconId);
  if (!lexiconId) return { ok: false, error: "Invalid dictionary id." };
  const mediaAssetId = input.mediaAssetId.trim();
  if (!mediaAssetId) return { ok: false, error: "Missing media asset id." };
  const role = ensureRole(input.role);
  const surface = normalizeSurface(input.surface);

  const { supabase, user } = await requireTeacher();

  const { data: existing, error: existingErr } = await supabase
    .from("lexicon_media_links")
    .select("id")
    .eq("lexicon_id", lexiconId)
    .eq("media_asset_id", mediaAssetId)
    .eq("role", role)
    .maybeSingle();
  if (existingErr) {
    return {
      ok: false,
      error: migrationHint(existingErr.message),
    };
  }
  if (existing?.id) {
    await softEnrichMediaMeta(supabase, user.id, mediaAssetId, surface, lexiconId);
    return { ok: true, linkId: existing.id as string };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("lexicon_media_links")
    .insert({
      lexicon_id: lexiconId,
      media_asset_id: mediaAssetId,
      role,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insertErr) {
    return { ok: false, error: migrationHint(insertErr.message) };
  }

  await softEnrichMediaMeta(supabase, user.id, mediaAssetId, surface, lexiconId);
  revalidatePath("/teacher/media");
  revalidatePath("/teacher/dictionary/review");
  return { ok: true, linkId: inserted.id as string };
}

/** Resolve media_assets by public URL, then link to the lexicon id. */
export async function linkLexiconMediaByPublicUrl(input: {
  lexiconId: string;
  publicUrl: string;
  role?: LexiconMediaRole;
  surface?: string | null;
}): Promise<{ ok: true; linkId: string } | { ok: false; error: string }> {
  const publicUrl = input.publicUrl.trim();
  if (!publicUrl.startsWith("http")) {
    return { ok: false, error: "Only cloud media library URLs can be linked." };
  }
  const { supabase } = await requireTeacher();
  const { data: asset, error } = await supabase
    .from("media_assets")
    .select("id")
    .eq("public_url", publicUrl)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!asset?.id) {
    return {
      ok: false,
      error: "That URL is not in the shared media library (Studio-only uploads are separate).",
    };
  }
  return linkLexiconMedia({
    lexiconId: input.lexiconId,
    mediaAssetId: asset.id as string,
    role: input.role,
    surface: input.surface,
  });
}

export async function listLexiconMediaLinks(
  lexiconId: string,
): Promise<LexiconMediaLinkRow[]> {
  const id = normalizeLexiconId(lexiconId);
  if (!id) return [];
  const { supabase } = await requireTeacher();
  const { data, error } = await supabase
    .from("lexicon_media_links")
    .select(
      "id,lexicon_id,media_asset_id,role,created_by,created_at,media_assets(public_url,content_type,original_filename,meta_item_name)",
    )
    .eq("lexicon_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    if (/lexicon_media_links|does not exist|42P01/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  const rows: LexiconMediaLinkRow[] = [];
  for (const raw of data ?? []) {
    const mapped = mapJoinedRow(
      raw as Parameters<typeof mapJoinedRow>[0],
    );
    if (mapped) rows.push(mapped);
  }
  return rows;
}

export async function unlinkLexiconMedia(
  linkId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = linkId.trim();
  if (!id) return { ok: false, error: "Missing link id." };
  const { supabase } = await requireTeacher();
  const { error } = await supabase
    .from("lexicon_media_links")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher/media");
  revalidatePath("/teacher/dictionary/review");
  return { ok: true };
}

/**
 * Fill missing vocab-list image/audio from lexicon↔media links (many assets OK;
 * picks the newest illustration / pronunciation per word).
 */
export async function enrichVocabListMediaFromLexicon(
  list: VocabularyListDocument,
): Promise<VocabularyListDocument> {
  const lexiconIds = [
    ...new Set(
      list.entries
        .map((entry) => entry.sourceWordId?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (lexiconIds.length < 1) return list;

  const needsEnrichment = list.entries.some(
    (entry) =>
      entry.sourceWordId &&
      (!entry.imageUrl?.trim() || !entry.audioUrl?.trim()),
  );
  if (!needsEnrichment) return list;

  const { supabase } = await requireTeacher();
  const { data, error } = await supabase
    .from("lexicon_media_links")
    .select(
      "lexicon_id,role,created_at,media_assets(public_url,content_type)",
    )
    .in("lexicon_id", lexiconIds)
    .order("created_at", { ascending: false });

  if (error) {
    if (/lexicon_media_links|does not exist|42P01/i.test(error.message)) {
      return list;
    }
    throw new Error(error.message);
  }

  const preferred: Record<string, LexiconMediaPreference> = {};
  for (const raw of data ?? []) {
    const lexiconId = String(raw.lexicon_id ?? "").trim();
    if (!lexiconId) continue;
    const media = Array.isArray(raw.media_assets)
      ? raw.media_assets[0]
      : raw.media_assets;
    const url =
      media && typeof media.public_url === "string"
        ? media.public_url.trim()
        : "";
    if (!url) continue;
    const contentType =
      media && typeof media.content_type === "string" ? media.content_type : "";
    const role = String(raw.role ?? "");
    const slot = preferred[lexiconId] ?? (preferred[lexiconId] = {});

    const isImage =
      contentType.startsWith("image/") ||
      role === "illustration" ||
      role === "scene";
    const isAudio =
      contentType.startsWith("audio/") || role === "pronunciation";

    // Prefer dedicated illustrations over scene art when both exist.
    if (isImage && !slot.imageUrl) {
      if (role !== "scene") slot.imageUrl = url;
    }
    if (isAudio && !slot.audioUrl) slot.audioUrl = url;
  }

  // Second pass: allow scene-linked images only when no illustration was found.
  for (const raw of data ?? []) {
    const lexiconId = String(raw.lexicon_id ?? "").trim();
    if (!lexiconId) continue;
    const media = Array.isArray(raw.media_assets)
      ? raw.media_assets[0]
      : raw.media_assets;
    const url =
      media && typeof media.public_url === "string"
        ? media.public_url.trim()
        : "";
    if (!url) continue;
    const contentType =
      media && typeof media.content_type === "string" ? media.content_type : "";
    const role = String(raw.role ?? "");
    const slot = preferred[lexiconId] ?? (preferred[lexiconId] = {});
    if (slot.imageUrl) continue;
    if (role === "scene" || contentType.startsWith("image/")) {
      slot.imageUrl = url;
    }
  }

  return applyLexiconMediaPreferences(list, preferred);
}

async function softEnrichMediaMeta(
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"],
  teacherId: string,
  mediaAssetId: string,
  surface: string | null,
  lexiconId: string,
) {
  if (!surface) return;
  const { data: row } = await supabase
    .from("media_assets")
    .select("uploaded_by,meta_item_name,meta_tags,meta_alternative_names")
    .eq("id", mediaAssetId)
    .maybeSingle();
  if (!row || row.uploaded_by !== teacherId) return;

  const patch: Record<string, unknown> = {};
  if (!row.meta_item_name) {
    patch.meta_item_name = surface.toLowerCase();
  }
  const tags = Array.isArray(row.meta_tags) ? [...row.meta_tags] : [];
  const tagKey = `lex:${lexiconId}`;
  if (!tags.some((t) => String(t).toLowerCase() === tagKey.toLowerCase())) {
    tags.push(tagKey);
    patch.meta_tags = tags.slice(0, 40);
  }
  const alts = Array.isArray(row.meta_alternative_names)
    ? [...row.meta_alternative_names]
    : [];
  const surfaceKey = surface.toLowerCase();
  if (!alts.some((a) => String(a).toLowerCase() === surfaceKey)) {
    alts.push(surfaceKey);
    patch.meta_alternative_names = alts.slice(0, 40);
  }
  if (Object.keys(patch).length === 0) return;
  await supabase.from("media_assets").update(patch).eq("id", mediaAssetId);
}

function migrationHint(message: string): string {
  if (/lexicon_media_links|does not exist|42P01/i.test(message)) {
    return `${message} Run migration web/supabase/migrations/079_lexicon_media_links.sql.`;
  }
  return message;
}
