import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexedSentenceRow } from "@/lib/curated-sentences/quiz-compiler-types";
import {
  type MediaRow,
  type VocabMediaLookupInput,
  mediaCategoriesOverlapRowTopics,
  mediaLookupKeysForRow,
  pickBestMediaUrlForRow,
  mediaLookupKeysForVocabWord,
  mediaCategoriesOverlapTopicSlugs,
} from "./media-asset-lookup";

export type { MediaRow, VocabMediaLookupInput } from "./media-asset-lookup";
export {
  mediaLookupKeysForRow,
  mediaLookupKeysForVocabWord,
  mediaCategoriesOverlapTopicSlugs,
  pickBestMediaUrlForKeys,
  pickBestMediaUrlForRow,
  pickBestMediaUrlForVocabWord,
} from "./media-asset-lookup";

const IMAGE_FETCH_LIMIT = 900;

export async function fetchImageMediaRowsForLookup(
  supabase: SupabaseClient,
  limit: number = IMAGE_FETCH_LIMIT,
): Promise<MediaRow[]> {
  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "public_url, meta_item_name, meta_categories, meta_tags, meta_alternative_names, original_filename, created_at",
    )
    .like("content_type", "image/%")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return data as MediaRow[];
}

export async function resolveMediaPublicUrlForRow(
  row: IndexedSentenceRow,
  supabase: SupabaseClient,
): Promise<string | null> {
  const keys = mediaLookupKeysForRow(row);
  if (keys.length === 0) return null;

  const rows = await fetchImageMediaRowsForLookup(supabase);
  const hit = pickBestMediaUrlForRow(row, rows);
  if (hit) return hit;

  const primary = keys[0];
  if (!primary) return null;
  const pattern = `%${primary.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const { data: narrow } = await supabase
    .from("media_assets")
    .select("public_url, meta_categories, created_at")
    .like("content_type", "image/%")
    .ilike("meta_item_name", pattern)
    .order("created_at", { ascending: false })
    .limit(1);
  const narrowHit = narrow?.[0] as
    | { public_url: string; meta_categories?: string[] | null }
    | undefined;
  if (!narrowHit?.public_url) return null;
  if (!mediaCategoriesOverlapRowTopics(row, narrowHit.meta_categories)) return null;
  return narrowHit.public_url;
}

export async function resolveMediaUrlsForSlides(
  rows: IndexedSentenceRow[],
  supabase: SupabaseClient,
): Promise<(string | null)[]> {
  const mediaRows = await fetchImageMediaRowsForLookup(supabase);
  return rows.map((r) => pickBestMediaUrlForRow(r, mediaRows));
}
