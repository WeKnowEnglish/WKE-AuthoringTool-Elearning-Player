"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/actions/teacher";
import { linkLexiconMedia } from "@/lib/actions/lexicon-media";
import {
  createTeacherLexiconEntry,
  submitTeacherLexiconForCurriculum,
  updateTeacherLexiconEntry,
} from "@/lib/actions/teacher-lexicon";
import {
  isSceneishMedia,
  itemNameFromFilename,
  matchMediaSurfaceToLexicon,
  type MediaLexiconMatchConfidence,
  type MediaLexiconMatchKind,
} from "@/lib/vocabulary/lexicon-media/match-from-item-name";

export type MediaLexiconQueueStatus = "pending" | "linked" | "dismissed" | "word_requested";

export type MediaLexiconMatchQueueRow = {
  id: string;
  media_asset_id: string;
  queried_surface: string;
  status: MediaLexiconQueueStatus;
  confidence: MediaLexiconMatchConfidence;
  match_kind: MediaLexiconMatchKind;
  candidate_lexicon_ids: string[];
  chosen_lexicon_id: string | null;
  teacher_lexicon_entry_id: string | null;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  media?: {
    id: string;
    public_url: string;
    original_filename: string;
    content_type: string;
    meta_item_name: string | null;
  } | null;
};

export type ProcessMediaLexiconMatchResult =
  | { outcome: "skipped"; reason: string }
  | { outcome: "linked"; lexiconId: string; surface: string }
  | { outcome: "queued"; queueId: string; surface: string; matchKind: MediaLexiconMatchKind };

function revalidateMediaPaths() {
  revalidatePath("/teacher/media");
  revalidatePath("/teacher/dictionary/review");
}

function roleForContentType(contentType: string): "illustration" | "pronunciation" {
  return String(contentType || "").toLowerCase().startsWith("audio/") ?
      "pronunciation"
    : "illustration";
}

/**
 * After upload / metadata save: auto-link high-confidence matches,
 * otherwise enqueue a pending review row.
 */
export async function processMediaLexiconMatch(input: {
  mediaAssetId: string;
  /** Prefer meta_item_name; falls back to filename stem. */
  itemName?: string | null;
  originalFilename?: string | null;
  contentType?: string | null;
  metaTags?: string[] | null;
  metaCategories?: string[] | null;
}): Promise<ProcessMediaLexiconMatchResult> {
  const { supabase, user } = await requireTeacher();

  if (
    isSceneishMedia({
      metaItemName: input.itemName,
      originalFilename: input.originalFilename,
      metaTags: input.metaTags,
      metaCategories: input.metaCategories,
    })
  ) {
    return { outcome: "skipped", reason: "Scene/background media — not auto-matched" };
  }

  const surfaceRaw =
    (input.itemName && input.itemName.trim()) ||
    itemNameFromFilename(input.originalFilename || "") ||
    "";
  if (!surfaceRaw.trim()) {
    return { outcome: "skipped", reason: "No item name or filename stem to match" };
  }

  const match = matchMediaSurfaceToLexicon(surfaceRaw);
  if (match.matchKind === "skipped" || !match.surface) {
    return { outcome: "skipped", reason: match.reason };
  }

  const role = roleForContentType(input.contentType || "image/png");

  // Soft-fill meta_item_name when we derived from filename
  if (!input.itemName?.trim() && surfaceRaw.trim()) {
    await supabase
      .from("media_assets")
      .update({ meta_item_name: surfaceRaw.trim().slice(0, 120) })
      .eq("id", input.mediaAssetId)
      .eq("uploaded_by", user.id);
  }

  if (match.autoLink && match.chosen) {
    const link = await linkLexiconMedia({
      lexiconId: match.chosen.id,
      mediaAssetId: input.mediaAssetId,
      role,
      surface: match.chosen.lemma,
    });
    if (!link.ok) {
      // Fall through to queue so teacher can still review
      return enqueuePending({
        supabase,
        userId: user.id,
        mediaAssetId: input.mediaAssetId,
        surface: match.surface,
        matchKind: match.matchKind,
        confidence: "medium",
        candidates: match.candidates.map((c) => c.id),
        chosen: match.chosen.id,
        note: `Auto-link failed: ${link.error}`,
      });
    }

    // Close any prior pending row
    await supabase
      .from("media_lexicon_match_queue")
      .update({
        status: "linked",
        chosen_lexicon_id: match.chosen.id,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        note: "Auto-linked on upload",
      })
      .eq("media_asset_id", input.mediaAssetId)
      .eq("status", "pending");

    revalidateMediaPaths();
    return {
      outcome: "linked",
      lexiconId: match.chosen.id,
      surface: match.surface,
    };
  }

  return enqueuePending({
    supabase,
    userId: user.id,
    mediaAssetId: input.mediaAssetId,
    surface: match.surface,
    matchKind: match.matchKind,
    confidence: match.confidence,
    candidates: match.candidates.map((c) => c.id),
    chosen: match.chosen?.id ?? null,
    note: match.reason,
  });
}

async function enqueuePending(input: {
  supabase: Awaited<ReturnType<typeof requireTeacher>>["supabase"];
  userId: string;
  mediaAssetId: string;
  surface: string;
  matchKind: MediaLexiconMatchKind;
  confidence: MediaLexiconMatchConfidence;
  candidates: string[];
  chosen: string | null;
  note: string;
}): Promise<ProcessMediaLexiconMatchResult> {
  const now = new Date().toISOString();
  // Replace existing pending for this asset
  await input.supabase
    .from("media_lexicon_match_queue")
    .delete()
    .eq("media_asset_id", input.mediaAssetId)
    .eq("status", "pending");

  const { data, error } = await input.supabase
    .from("media_lexicon_match_queue")
    .insert({
      media_asset_id: input.mediaAssetId,
      queried_surface: input.surface.slice(0, 120),
      status: "pending",
      confidence: input.confidence,
      match_kind: input.matchKind,
      candidate_lexicon_ids: input.candidates,
      chosen_lexicon_id: input.chosen,
      created_by: input.userId,
      note: input.note.slice(0, 500),
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    if (/media_lexicon_match_queue|does not exist|42P01/i.test(error.message)) {
      return {
        outcome: "skipped",
        reason:
          "Match queue table missing — run migration 081_media_lexicon_match_queue.sql",
      };
    }
    return { outcome: "skipped", reason: error.message };
  }

  revalidateMediaPaths();
  return {
    outcome: "queued",
    queueId: data.id as string,
    surface: input.surface,
    matchKind: input.matchKind,
  };
}

export async function listPendingMediaLexiconMatches(limit = 48): Promise<{
  rows: MediaLexiconMatchQueueRow[];
  total: number;
}> {
  const { supabase } = await requireTeacher();
  const lim = Math.min(Math.max(limit, 1), 200);

  const { data, error, count } = await supabase
    .from("media_lexicon_match_queue")
    .select(
      "*, media_assets(id, public_url, original_filename, content_type, meta_item_name)",
      { count: "exact" },
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(lim);

  if (error) {
    if (/media_lexicon_match_queue|does not exist|42P01/i.test(error.message)) {
      return { rows: [], total: 0 };
    }
    throw new Error(error.message);
  }

  const rows: MediaLexiconMatchQueueRow[] = (data || []).map((raw) => {
    const r = raw as Record<string, unknown>;
    const media = r.media_assets as Record<string, unknown> | null;
    return {
      id: String(r.id),
      media_asset_id: String(r.media_asset_id),
      queried_surface: String(r.queried_surface),
      status: r.status as MediaLexiconQueueStatus,
      confidence: r.confidence as MediaLexiconMatchConfidence,
      match_kind: r.match_kind as MediaLexiconMatchKind,
      candidate_lexicon_ids: Array.isArray(r.candidate_lexicon_ids) ?
        (r.candidate_lexicon_ids as string[])
      : [],
      chosen_lexicon_id: (r.chosen_lexicon_id as string) || null,
      teacher_lexicon_entry_id: (r.teacher_lexicon_entry_id as string) || null,
      created_by: String(r.created_by),
      reviewed_by: (r.reviewed_by as string) || null,
      reviewed_at: (r.reviewed_at as string) || null,
      note: (r.note as string) || null,
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      media: media ?
        {
          id: String(media.id),
          public_url: String(media.public_url),
          original_filename: String(media.original_filename),
          content_type: String(media.content_type),
          meta_item_name: (media.meta_item_name as string) || null,
        }
      : null,
    };
  });

  return { rows, total: count ?? rows.length };
}

export async function confirmMediaLexiconMatch(input: {
  queueId: string;
  lexiconId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireTeacher();
  const { data: row, error } = await supabase
    .from("media_lexicon_match_queue")
    .select("*")
    .eq("id", input.queueId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "Queue item not found." };

  const { data: asset } = await supabase
    .from("media_assets")
    .select("content_type")
    .eq("id", row.media_asset_id)
    .maybeSingle();

  const link = await linkLexiconMedia({
    lexiconId: input.lexiconId,
    mediaAssetId: row.media_asset_id as string,
    role: roleForContentType(String(asset?.content_type || "image/png")),
    surface: String(row.queried_surface),
  });
  if (!link.ok) return { ok: false, error: link.error };

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("media_lexicon_match_queue")
    .update({
      status: "linked",
      chosen_lexicon_id: input.lexiconId,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
      note: "Confirmed by teacher",
    })
    .eq("id", input.queueId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidateMediaPaths();
  return { ok: true };
}

export async function dismissMediaLexiconMatch(
  queueId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await requireTeacher();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("media_lexicon_match_queue")
    .update({
      status: "dismissed",
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", queueId)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidateMediaPaths();
  return { ok: true };
}

/**
 * No dictionary match: create a teacher lexicon entry and submit it to
 * Lexicon review (promotion_status = pending) so curriculum can promote it.
 */
export async function requestDictionaryWordFromMediaMatch(
  queueId: string,
): Promise<
  | { ok: true; teacherLexiconId: string }
  | { ok: false; error: string }
> {
  const { supabase, user } = await requireTeacher();
  const { data: row, error } = await supabase
    .from("media_lexicon_match_queue")
    .select("*")
    .eq("id", queueId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: false, error: "Queue item not found." };

  const surface = String(row.queried_surface || "").trim();
  if (!surface) return { ok: false, error: "Missing word surface." };

  const created = await createTeacherLexiconEntry({
    surface,
    entryKind: surface.includes(" ") ? "phrase" : "word",
    pos: "noun",
    primaryStage: "A1_1",
    primaryTopic: "general_language",
    note: `Requested from media library match queue (${row.media_asset_id}).`,
  });
  if (!created.ok) return { ok: false, error: created.error };

  // Fill fields required to land in Submitted / Lexicon review
  const updated = await updateTeacherLexiconEntry({
    id: created.entry.id,
    learnerDefinitionEn: `Media request: illustration uploaded for “${surface}”. Needs a learner-friendly definition before publish.`,
    primaryTopic: "general_language",
    primaryStage: "A1_1",
    pos: "noun",
    status: "ready",
  });
  if (!updated.ok) return { ok: false, error: updated.error };

  const submitted = await submitTeacherLexiconForCurriculum(created.entry.id);
  if (!submitted.ok) {
    return {
      ok: false,
      error: `Word created but could not submit for review: ${submitted.error}`,
    };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("media_lexicon_match_queue")
    .update({
      status: "word_requested",
      teacher_lexicon_entry_id: created.entry.id,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
      note: "Submitted to Lexicon review for promotion",
    })
    .eq("id", queueId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidateMediaPaths();
  return { ok: true, teacherLexiconId: created.entry.id };
}
