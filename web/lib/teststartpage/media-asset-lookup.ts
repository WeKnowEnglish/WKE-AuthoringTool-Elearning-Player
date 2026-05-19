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

export function mediaCategoriesOverlapRowTopics(
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

export function mediaCategoriesOverlapTopicSlugs(
  topicSlugs: readonly string[] | undefined,
  metaCategories: string[] | null | undefined,
): boolean {
  const required = normalizedTopicSet(topicSlugs ? [...topicSlugs] : []);
  if (required.size === 0) return true;
  const cats = normalizedTopicSet(metaCategories);
  if (cats.size === 0) return true;
  for (const c of cats) {
    if (required.has(c)) return true;
  }
  return false;
}

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

export type VocabMediaLookupInput = {
  id: string;
  lemma: string;
  extraKeys?: string[];
  topicSlugs?: readonly string[];
};

export function mediaLookupKeysForVocabWord(input: VocabMediaLookupInput): string[] {
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

  push(input.id);
  push(input.lemma);
  if (input.id.includes("_")) push(input.id.replace(/_/g, " "));
  for (const k of input.extraKeys ?? []) push(k);
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

export function pickBestMediaUrlForKeys(
  keys: string[],
  mediaRows: MediaRow[],
  topicSlugs?: readonly string[],
): string | null {
  if (keys.length === 0 || mediaRows.length === 0) return null;

  let best: { url: string; score: number } | null = null;
  for (const r of mediaRows) {
    if (!mediaCategoriesOverlapTopicSlugs(topicSlugs, r.meta_categories)) continue;
    const s = scoreAgainstKeys(r, keys);
    if (s > 0 && (!best || s > best.score)) {
      best = { url: r.public_url, score: s };
    }
  }
  return best?.url ?? null;
}

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

export function pickBestMediaUrlForVocabWord(
  input: VocabMediaLookupInput,
  mediaRows: MediaRow[],
): string | null {
  return pickBestMediaUrlForKeys(
    mediaLookupKeysForVocabWord(input),
    mediaRows,
    input.topicSlugs,
  );
}
