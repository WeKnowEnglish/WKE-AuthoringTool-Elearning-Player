import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexedSentenceRow } from "@/lib/curated-sentences/quiz-compiler-types";

type MediaRow = {
  public_url: string;
  meta_item_name: string | null;
  meta_tags: string[] | null;
  meta_alternative_names: string[] | null;
  original_filename: string;
  created_at: string;
};

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
 * Pick the best `public_url` from `media_assets` for this sentence row (images only).
 */
export async function resolveMediaPublicUrlForRow(
  row: IndexedSentenceRow,
  supabase: SupabaseClient,
): Promise<string | null> {
  const keys = mediaLookupKeysForRow(row);
  if (keys.length === 0) return null;

  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "public_url, meta_item_name, meta_tags, meta_alternative_names, original_filename, created_at",
    )
    .like("content_type", "image/%")
    .order("created_at", { ascending: false })
    .limit(IMAGE_FETCH_LIMIT);

  if (error || !data?.length) return null;

  const rows = data as MediaRow[];
  let best: { url: string; score: number } | null = null;
  for (const r of rows) {
    const s = scoreAgainstKeys(r, keys);
    if (s > 0 && (!best || s > best.score)) {
      best = { url: r.public_url, score: s };
    }
  }

  if (best) return best.url;

  /** Narrow DB filter on primary key if the library is large and recent rows missed a match. */
  const primary = keys[0];
  if (!primary) return null;
  const pattern = `%${primary.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
  const { data: narrow } = await supabase
    .from("media_assets")
    .select("public_url, created_at")
    .like("content_type", "image/%")
    .ilike("meta_item_name", pattern)
    .order("created_at", { ascending: false })
    .limit(1);
  const hit = narrow?.[0] as { public_url: string } | undefined;
  return hit?.public_url ?? null;
}

export async function resolveMediaUrlsForSlides(
  rows: IndexedSentenceRow[],
  supabase: SupabaseClient,
): Promise<(string | null)[]> {
  return Promise.all(rows.map((r) => resolveMediaPublicUrlForRow(r, supabase)));
}
