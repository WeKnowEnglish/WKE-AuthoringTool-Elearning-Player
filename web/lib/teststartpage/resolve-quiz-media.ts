import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexedSentenceRow } from "@/lib/curated-sentences/quiz-compiler-types";

export type MediaRow = {
  public_url: string;
  meta_item_name: string | null;
  meta_categories: string[] | null;
  meta_tags: string[] | null;
  meta_alternative_names: string[] | null;
  original_filename: string;
  created_at: string;
};

function normalizedTopicSet(values: string[] | null | undefined): Set<string> {
  const s = new Set<string>();
  for (const v of values ?? []) {
    const t = v.trim().toLowerCase();
    if (t) s.add(t);
  }
  return s;
}

/**
 * When the sentence row has vocabulary topics, ignore tagged media that shares none of them.
 * Untagged media (`meta_categories` empty) stays in the pool so legacy uploads still match.
 */
function mediaCategoriesOverlapRowTopics(
  row: IndexedSentenceRow,
  metaCategories: string[] | null | undefined,
): boolean {
  const rowTopics = normalizedTopicSet(row.vocabulary?.topics);
  if (rowTopics.size === 0) return true;
  const cats = normalizedTopicSet(metaCategories);
  if (cats.size === 0) return true;
  for (const c of cats) {
    if (rowTopics.has(c)) return true;
  }
  return false;
}

/** Ordered lookup strings: media_hint, lemma/forms, then surface target. */
export function mediaLookupKeysForRow(row: IndexedSentenceRow): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  function push(s: string | null | undefined) {
    const t = (s ?? "").trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  }

  push(row.vocabulary?.media_hint);
  push(row.vocabulary?.lemma);
  push(row.vocabulary?.forms?.base);
  push(row.target_word);
  return out;
}

function scoreAgainstKeys(row: MediaRow, keys: string[]): number {
  let score = 0;
  const name = (row.meta_item_name ?? "").toLowerCase();
  const fn = (row.original_filename ?? "").toLowerCase();
  for (const rawKey of keys) {
    const k = rawKey.toLowerCase();
    if (!k) continue;
    if (name === k) score += 120;
    else if (name.includes(k)) score += 70;
    if (fn.includes(k)) score += 35;
    for (const t of row.meta_tags ?? []) {
      const tl = t.toLowerCase();
      if (tl === k) score += 55;
      else if (tl.includes(k)) score += 28;
    }
    for (const a of row.meta_alternative_names ?? []) {
      const al = a.toLowerCase();
      if (al === k) score += 60;
      else if (al.includes(k)) score += 32;
    }
  }
  return score;
}

const IMAGE_FETCH_LIMIT = 900;

/**
 * One Supabase round-trip: recent image rows used for scoring many lookups in memory.
 */
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

/** Best image URL for one row against a pre-fetched media table (no I/O). */
export function pickBestMediaUrlForRow(row: IndexedSentenceRow, mediaRows: MediaRow[]): string | null {
  const keys = mediaLookupKeysForRow(row);
  if (keys.length === 0 || mediaRows.length === 0) return null;

  let best: { url: string; score: number } | null = null;
  for (const r of mediaRows) {
    if (!mediaCategoriesOverlapRowTopics(row, r.meta_categories)) continue;
    const s = scoreAgainstKeys(r, keys);
    if (s > 0 && (!best || s > best.score)) {
      best = { url: r.public_url, score: s };
    }
  }
  return best?.url ?? null;
}

/**
 * Pick the best `public_url` from `media_assets` for this sentence row (images only).
 */
export async function resolveMediaPublicUrlForRow(
  row: IndexedSentenceRow,
  supabase: SupabaseClient,
): Promise<string | null> {
  const keys = mediaLookupKeysForRow(row);
  if (keys.length === 0) return null;

  const rows = await fetchImageMediaRowsForLookup(supabase);
  const hit = pickBestMediaUrlForRow(row, rows);
  if (hit) return hit;

  /** Narrow DB filter on primary key if the library is large and recent rows missed a match. */
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

/**
 * Resolve URLs for many slides with **one** media fetch (in-memory scoring per row).
 * Skips per-row narrow fallback to avoid N extra queries; rare misses stay image-less.
 */
export async function resolveMediaUrlsForSlides(
  rows: IndexedSentenceRow[],
  supabase: SupabaseClient,
): Promise<(string | null)[]> {
  const mediaRows = await fetchImageMediaRowsForLookup(supabase);
  return rows.map((r) => pickBestMediaUrlForRow(r, mediaRows));
}
