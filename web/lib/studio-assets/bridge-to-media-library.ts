import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { PublishStudioAssetResult } from "@/lib/studio-assets/types";
import {
  lexiconIdFromStudioMeta,
  lexiconLinkRoleFromStudioMeta,
  mediaCategoriesFromStudioMeta,
  mediaTagsFromStudioMeta,
  shouldBridgeStudioMetaToMediaLibrary,
  surfaceFromStudioMeta,
} from "@/lib/vocabulary/lexicon-media/apply-to-vocab-list";
import type { LexiconMediaRole } from "@/lib/vocabulary/lexicon-media/types";

const MEDIA_BUCKET = "lesson_media";

export type BridgedStudioPublishResult = PublishStudioAssetResult & {
  media_asset_id?: string;
  /** Prefer this URL so assets live in the shared media library. */
  media_public_url?: string;
};

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

/**
 * Mirror a Studio upload into `media_assets` (dedupe by sha256).
 * Lexicon links are created only when meta includes sourceWordId.
 */
export async function bridgeStudioPublishToMediaLibrary(input: {
  supabase: SupabaseClient;
  user: User;
  bytes: Uint8Array;
  contentSha256: string;
  contentType: string;
  kind: "image" | "audio";
  originalFilename: string;
  meta: Record<string, unknown>;
  studioResult: PublishStudioAssetResult;
}): Promise<BridgedStudioPublishResult> {
  const { studioResult, meta } = input;
  if (!shouldBridgeStudioMetaToMediaLibrary(meta)) {
    return studioResult;
  }

  try {
    const existing = await findMediaBySha256(
      input.supabase,
      input.contentSha256,
      input.kind,
    );
    let mediaAssetId = existing?.id ?? null;
    let mediaPublicUrl = existing?.public_url ?? null;

    if (!mediaAssetId || !mediaPublicUrl) {
      const mirrored = await uploadMediaCopy(input);
      mediaAssetId = mirrored.id;
      mediaPublicUrl = mirrored.public_url;
    } else {
      await softEnrichOwnedMedia(
        input.supabase,
        mediaAssetId,
        input.user.id,
        meta,
      );
    }

    const lexiconId = lexiconIdFromStudioMeta(meta);
    const surface = surfaceFromStudioMeta(meta);
    if (lexiconId && mediaAssetId) {
      await upsertLexiconLink(input.supabase, {
        lexiconId,
        mediaAssetId,
        role: lexiconLinkRoleFromStudioMeta(meta, input.kind),
        teacherId: input.user.id,
        surface,
      });
    }

    return {
      ...studioResult,
      media_asset_id: mediaAssetId ?? undefined,
      media_public_url: mediaPublicUrl ?? undefined,
    };
  } catch {
    // Bridging must not fail Studio publish.
    return studioResult;
  }
}

async function findMediaBySha256(
  supabase: SupabaseClient,
  sha256: string,
  kind: "image" | "audio",
): Promise<{ id: string; public_url: string } | null> {
  const prefix = kind === "audio" ? "audio/%" : "image/%";
  const { data } = await supabase
    .from("media_assets")
    .select("id,public_url")
    .eq("sha256_hash", sha256)
    .like("content_type", prefix)
    .limit(1)
    .maybeSingle();
  if (!data?.id || !data.public_url) return null;
  return { id: data.id as string, public_url: data.public_url as string };
}

async function uploadMediaCopy(input: {
  supabase: SupabaseClient;
  user: User;
  bytes: Uint8Array;
  contentSha256: string;
  contentType: string;
  originalFilename: string;
  meta: Record<string, unknown>;
}): Promise<{ id: string; public_url: string }> {
  const safe = sanitizeFilename(input.originalFilename);
  const path = `${input.user.id}/${crypto.randomUUID()}-${safe}`;
  const { error: upErr } = await input.supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, input.bytes, { contentType: input.contentType, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data: pub } = input.supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  const surface = surfaceFromStudioMeta(input.meta);
  const categories = mediaCategoriesFromStudioMeta(input.meta);
  const tags = mediaTagsFromStudioMeta(input.meta);

  const { data: row, error: insErr } = await input.supabase
    .from("media_assets")
    .insert({
      storage_path: path,
      public_url: publicUrl,
      original_filename: input.originalFilename.slice(0, 255) || safe,
      content_type: input.contentType,
      uploaded_by: input.user.id,
      sha256_hash: input.contentSha256,
      ...(surface ? { meta_item_name: surface.toLowerCase() } : {}),
      ...(surface ? { meta_alternative_names: [surface.toLowerCase()] } : {}),
      ...(categories.length ? { meta_categories: categories } : {}),
      ...(tags.length ? { meta_tags: tags } : {}),
    })
    .select("id,public_url")
    .single();

  if (insErr || !row) {
    await input.supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw new Error(insErr?.message ?? "Could not mirror into media library.");
  }
  return { id: row.id as string, public_url: row.public_url as string };
}

async function upsertLexiconLink(
  supabase: SupabaseClient,
  input: {
    lexiconId: string;
    mediaAssetId: string;
    role: LexiconMediaRole;
    teacherId: string;
    surface: string | null;
  },
) {
  const { data: existing } = await supabase
    .from("lexicon_media_links")
    .select("id")
    .eq("lexicon_id", input.lexiconId)
    .eq("media_asset_id", input.mediaAssetId)
    .eq("role", input.role)
    .maybeSingle();
  if (!existing?.id) {
    await supabase.from("lexicon_media_links").insert({
      lexicon_id: input.lexiconId,
      media_asset_id: input.mediaAssetId,
      role: input.role,
      created_by: input.teacherId,
    });
  }
  await softEnrichOwnedMedia(supabase, input.mediaAssetId, input.teacherId, {
    word: input.surface ?? undefined,
    sourceWordId: input.lexiconId,
  });
}

async function softEnrichOwnedMedia(
  supabase: SupabaseClient,
  mediaAssetId: string,
  teacherId: string,
  meta: Record<string, unknown>,
) {
  const { data: row } = await supabase
    .from("media_assets")
    .select(
      "uploaded_by,meta_item_name,meta_tags,meta_alternative_names,meta_categories",
    )
    .eq("id", mediaAssetId)
    .maybeSingle();
  if (!row || row.uploaded_by !== teacherId) return;

  const surface = surfaceFromStudioMeta(meta);
  const patch: Record<string, unknown> = {};
  if (surface && !row.meta_item_name) {
    patch.meta_item_name = surface.toLowerCase();
  }
  if (surface) {
    const alts = Array.isArray(row.meta_alternative_names)
      ? [...row.meta_alternative_names]
      : [];
    if (!alts.some((a) => String(a).toLowerCase() === surface.toLowerCase())) {
      alts.push(surface.toLowerCase());
      patch.meta_alternative_names = alts.slice(0, 40);
    }
  }

  const nextTags = Array.isArray(row.meta_tags) ? [...row.meta_tags] : [];
  for (const tag of mediaTagsFromStudioMeta(meta)) {
    if (!nextTags.some((t) => String(t).toLowerCase() === tag.toLowerCase())) {
      nextTags.push(tag);
    }
  }
  if (nextTags.length > (Array.isArray(row.meta_tags) ? row.meta_tags.length : 0)) {
    patch.meta_tags = nextTags.slice(0, 40);
  }

  const nextCats = Array.isArray(row.meta_categories) ? [...row.meta_categories] : [];
  for (const cat of mediaCategoriesFromStudioMeta(meta)) {
    if (!nextCats.some((c) => String(c).toLowerCase() === cat.toLowerCase())) {
      nextCats.push(cat);
    }
  }
  if (
    nextCats.length > (Array.isArray(row.meta_categories) ? row.meta_categories.length : 0)
  ) {
    patch.meta_categories = nextCats.slice(0, 40);
  }

  if (Object.keys(patch).length === 0) return;
  await supabase.from("media_assets").update(patch).eq("id", mediaAssetId);
}
