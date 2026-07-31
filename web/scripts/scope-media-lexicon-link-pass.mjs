/**
 * Read-only scope report: media_assets vs lexicon_media_links.
 * Usage (from web/): node scripts/scope-media-lexicon-link-pass.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const envText = fs.readFileSync(envPath, "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!m) continue;
  env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or key in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function fetchAll(table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  let headerCount = null;
  for (;;) {
    const { data, error, count } = await sb
      .from(table)
      .select("*", { count: "exact" })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (headerCount == null) headerCount = count;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) {
      return { rows, total: headerCount ?? rows.length };
    }
    from += pageSize;
  }
}

function kindOf(ct) {
  const c = String(ct || "").toLowerCase();
  if (c.startsWith("image/")) return "image";
  if (c.startsWith("audio/")) return "audio";
  if (c.startsWith("video/")) return "video";
  return "other";
}

function isSceneish(row) {
  const cats = (row.meta_categories || []).map((s) => String(s).toLowerCase());
  const tags = (row.meta_tags || []).map((s) => String(s).toLowerCase());
  return (
    cats.some((c) => ["scene", "sprite", "background", "prop"].includes(c)) ||
    tags.some((t) =>
      ["scene", "sprite", "background", "explore_hotspots"].includes(t),
    )
  );
}

function hasNamingSignal(row) {
  const name = String(row.meta_item_name || "").trim();
  const alts = row.meta_alternative_names || [];
  const stem = String(row.original_filename || "").replace(/\.[^.]+$/, "");
  return Boolean(name || (alts && alts.length) || stem.trim());
}

const media = await fetchAll("media_assets");
let links = { rows: [], total: 0 };
try {
  links = await fetchAll("lexicon_media_links");
} catch (e) {
  console.warn("lexicon_media_links:", e.message);
}

const byKind = { image: 0, audio: 0, video: 0, other: 0 };
const withItemName = { image: 0, audio: 0, video: 0, other: 0 };
const withAlts = { image: 0, audio: 0, video: 0, other: 0 };
const withTags = { image: 0, audio: 0, video: 0, other: 0 };
const sceneish = { image: 0, audio: 0, video: 0, other: 0 };
const vocabCat = { image: 0, audio: 0, video: 0, other: 0 };
const emptyMeta = { image: 0, audio: 0, video: 0, other: 0 };

const alreadyLinkedIds = new Set(links.rows.map((r) => r.media_asset_id));
let alreadyLinkedMedia = 0;

for (const row of media.rows) {
  const k = kindOf(row.content_type);
  byKind[k] += 1;
  if (alreadyLinkedIds.has(row.id)) alreadyLinkedMedia += 1;
  const name = String(row.meta_item_name || "").trim();
  const alts = row.meta_alternative_names || [];
  const tags = row.meta_tags || [];
  const cats = row.meta_categories || [];
  if (name) withItemName[k] += 1;
  if (alts.length) withAlts[k] += 1;
  if (tags.length) withTags[k] += 1;
  if (isSceneish(row)) sceneish[k] += 1;
  if (cats.some((c) => String(c).toLowerCase() === "vocabulary")) vocabCat[k] += 1;
  if (!name && !alts.length && !tags.length && !cats.length) emptyMeta[k] += 1;
}

const images = media.rows.filter((r) => kindOf(r.content_type) === "image");
const audios = media.rows.filter((r) => kindOf(r.content_type) === "audio");

const linkableImages = images.filter(hasNamingSignal);
const linkableAudio = audios.filter(hasNamingSignal);
const sceneImages = images.filter(isSceneish);
const nonSceneLinkableImages = linkableImages.filter((r) => !isSceneish(r));

const unlinkedAllImages = images.filter((r) => !alreadyLinkedIds.has(r.id));
const unlinkedLinkableImages = linkableImages.filter(
  (r) => !alreadyLinkedIds.has(r.id),
);
const unlinkedNonSceneLinkable = nonSceneLinkableImages.filter(
  (r) => !alreadyLinkedIds.has(r.id),
);
const unlinkedLinkableAudio = linkableAudio.filter(
  (r) => !alreadyLinkedIds.has(r.id),
);

const report = {
  media_total: media.rows.length,
  links_total: links.rows.length,
  already_linked_media_rows: alreadyLinkedMedia,
  by_kind: byKind,
  with_item_name: withItemName,
  with_alt_names: withAlts,
  with_tags: withTags,
  sceneish_category_or_tag: sceneish,
  vocabulary_category: vocabCat,
  empty_meta_no_name_alts_tags_cats: emptyMeta,
  scrape_scope: {
    all_images: images.length,
    all_audio: audios.length,
    images_with_naming_signal: linkableImages.length,
    audio_with_naming_signal: linkableAudio.length,
    sceneish_images_exclude_from_word_pass: sceneImages.length,
    recommended_word_link_candidates_images: nonSceneLinkableImages.length,
    still_unlinked_recommended_images: unlinkedNonSceneLinkable.length,
    still_unlinked_all_images: unlinkedAllImages.length,
    still_unlinked_linkable_audio: unlinkedLinkableAudio.length,
  },
  sample_unlinked_recommended_images: unlinkedNonSceneLinkable
    .slice(0, 20)
    .map((r) => ({
      item: r.meta_item_name,
      file: r.original_filename,
      cats: r.meta_categories,
      tags: (r.meta_tags || []).slice(0, 5),
    })),
};

// Confidence buckets for chunking the pass
const nonSceneImages = images.filter((r) => !isSceneish(r));
let singleWord = 0;
let multiWord = 0;
let noName = 0;
const singleSamples = [];
for (const r of nonSceneImages) {
  const name = String(r.meta_item_name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!name) {
    noName += 1;
    continue;
  }
  if (name.split(" ").length === 1) {
    singleWord += 1;
    if (singleSamples.length < 40) singleSamples.push(name);
  } else {
    multiWord += 1;
  }
}
report.confidence_chunks = {
  non_scene_images: nonSceneImages.length,
  high_confidence_single_word_item_name: singleWord,
  medium_multi_word_item_name: multiWord,
  low_no_item_name_filename_only: noName,
  sample_single_word_names: [...new Set(singleSamples)].sort(),
};

console.log(JSON.stringify(report, null, 2));
