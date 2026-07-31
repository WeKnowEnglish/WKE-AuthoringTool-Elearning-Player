/**
 * Chunk A: link single-word meta_item_name images → dictionary (lexicon_media_links).
 *
 * Dry-run by default. Apply with --apply.
 *
 * Usage (from web/):
 *   node scripts/link-media-chunk-a-to-lexicon.mjs
 *   node scripts/link-media-chunk-a-to-lexicon.mjs --apply
 *   node scripts/link-media-chunk-a-to-lexicon.mjs --apply --limit=50
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocal = path.join(__dirname, "..", ".env.local");
dotenv.config({ path: envLocal });

if (existsSync(envLocal)) {
  const text = readFileSync(envLocal, "utf8");
  const m = text.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  if (m?.[1]) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = m[1].trim().replace(/^["']|["']$/g, "");
  }
}

const url =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
if (!url || !key) {
  console.error("Missing SUPABASE URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : null;

const SCENEISH = new Set([
  "scene",
  "background",
  "classroom",
  "room",
  "setting",
  "explore",
  "hotspot",
  "hotspots",
  "backdrop",
]);

function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSingleWord(s) {
  const n = normalize(s);
  return Boolean(n) && !n.includes(" ") && /^[\p{L}']+$/u.test(n);
}

/** Words that look plural but should not be stemmed (clothing, tools, etc.). */
const NO_SINGULARIZE = new Set([
  "shorts",
  "pants",
  "jeans",
  "glasses",
  "scissors",
  "clothes",
  "tweezers",
  "pliers",
  "binoculars",
  "pajamas",
  "pyjamas",
  "trousers",
  "overalls",
  "tongs",
  "leggings",
  "octopus",
  "platypus",
  "walrus",
  "bus",
  "cactus",
  "fungus",
  "buffalo",
  "moose",
  "deer",
  "sheep",
  "shrimp",
]);

const IRREGULAR_SINGULAR = {
  feet: "foot",
  teeth: "tooth",
  mice: "mouse",
  geese: "goose",
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
  leaves: "leaf",
  knives: "knife",
  wolves: "wolf",
  shelves: "shelf",
  loaves: "loaf",
  calves: "calf",
  halves: "half",
  lives: "life",
  wives: "wife",
  strawberries: "strawberry",
  cookies: "cookie",
  pancakes: "pancake",
  noodles: "noodle",
  puzzles: "puzzle",
  markers: "marker",
  mittens: "mitten",
  sandals: "sandal",
  sneakers: "sneaker",
  boots: "boot",
  chips: "chip",
  nuts: "nut",
  lips: "lip",
  lungs: "lung",
  organs: "organ",
  legos: "lego",
};

function simpleSingular(word) {
  const w = normalize(word);
  if (IRREGULAR_SINGULAR[w]) return IRREGULAR_SINGULAR[w];
  if (NO_SINGULARIZE.has(w)) return w;
  // cookie/movie style: vowel + ies → drop trailing s (not → y)
  if (/[aeiou]ies$/i.test(w) && w.length > 4) return w.slice(0, -1);
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (
    w.endsWith("ses") ||
    w.endsWith("xes") ||
    w.endsWith("zes") ||
    w.endsWith("ches") ||
    w.endsWith("shes")
  ) {
    return w.slice(0, -2);
  }
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) return w.slice(0, -1);
  return w;
}

function kindOf(contentType) {
  const c = String(contentType || "").toLowerCase();
  if (c.startsWith("image/")) return "image";
  if (c.startsWith("audio/")) return "audio";
  if (c.startsWith("video/")) return "video";
  return "other";
}

function isSceneish(asset) {
  const cats = (asset.meta_categories || []).map((s) => normalize(String(s)));
  const tags = (asset.meta_tags || []).map((s) => normalize(String(s)));
  if (cats.some((c) => ["scene", "sprite", "background", "prop"].includes(c))) return true;
  if (tags.some((t) => ["scene", "sprite", "background", "explore_hotspots"].includes(t))) return true;
  const blob = [asset.meta_item_name, asset.original_filename, ...cats, ...tags]
    .filter(Boolean)
    .map((x) => normalize(String(x)))
    .join(" ");
  for (const s of SCENEISH) {
    if (blob.split(" ").includes(s) || blob.includes(` ${s} `)) return true;
  }
  return false;
}

/** Prefer noun for objects; colors prefer adjective when both exist. */
const COLOR_LEMMAS = new Set([
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "black",
  "white",
  "gray",
  "grey",
  "brown",
]);

function pickBestLexicon(candidates, matchKey) {
  if (candidates.length === 1) return candidates[0];
  const byPos = (pos) => candidates.find((c) => c.pos === pos);
  if (COLOR_LEMMAS.has(matchKey) && byPos("adjective")) return byPos("adjective");
  return byPos("noun") || byPos("adjective") || byPos("verb") || candidates[0];
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchAll(table, select, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

const searchIndexPath = path.join(
  __dirname,
  "..",
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-search-index.v1.json",
);
const searchIndex = JSON.parse(readFileSync(searchIndexPath, "utf8"));

/** Map normalized lemma → search-index entries (for id when platform missing). */
const indexByLemma = new Map();
for (const e of searchIndex.entries || []) {
  const key = normalize(e.normalizedLemma || e.lemma);
  if (!key) continue;
  if (!indexByLemma.has(key)) indexByLemma.set(key, []);
  indexByLemma.get(key).push(e);
}

console.log("Loading platform lexicon + media…");
const [lexRows, assets, existingLinks] = await Promise.all([
  fetchAll("platform_lexicon_entries", "id, lemma, normalized, pos, status"),
  fetchAll(
    "media_assets",
    "id, content_type, original_filename, meta_item_name, meta_tags, meta_categories, uploaded_by",
  ),
  fetchAll("lexicon_media_links", "media_asset_id, lexicon_id, role"),
]);

const lexiconById = new Map(lexRows.map((r) => [r.id, r]));
const lexiconByLemma = new Map();
for (const r of lexRows) {
  if (r.status && r.status !== "published") continue;
  const key = normalize(r.normalized || r.lemma);
  if (!key) continue;
  if (!lexiconByLemma.has(key)) lexiconByLemma.set(key, []);
  lexiconByLemma.get(key).push(r);
}

const alreadyLinkedIllustration = new Set(
  existingLinks.filter((l) => l.role === "illustration").map((l) => `${l.lexicon_id}::${l.media_asset_id}`),
);
const mediaAlreadyHasIllustration = new Set(
  existingLinks.filter((l) => l.role === "illustration").map((l) => l.media_asset_id),
);

function resolveLexicon(itemName) {
  const exact = normalize(itemName);
  const singular = simpleSingular(exact);
  const tryKeys = exact === singular ? [exact] : [exact, singular];

  for (const key of tryKeys) {
    const platform = lexiconByLemma.get(key);
    if (platform?.length) {
      const best = pickBestLexicon(platform, key);
      return {
        lexiconId: best.id,
        lemma: best.lemma,
        pos: best.pos,
        matchKey: key,
        source: "platform_lexicon",
        ambiguous: platform.length > 1,
        candidates: platform.map((p) => `${p.id}(${p.pos})`),
      };
    }
  }

  for (const key of tryKeys) {
    const indexed = indexByLemma.get(key);
    if (indexed?.length) {
      const best = pickBestLexicon(indexed, key);
      // Prefer search-index id when it also exists on platform; otherwise still link
      // (lexicon_media_links.lexicon_id is text — primary candidates use same pv_* ids).
      return {
        lexiconId: best.id,
        lemma: best.lemma,
        pos: best.pos,
        matchKey: key,
        source: lexiconById.has(best.id) ? "search_index+platform" : "search_index",
        ambiguous: indexed.length > 1,
        candidates: indexed.map((p) => `${p.id}(${p.pos})`),
        missingPlatform: !lexiconById.has(best.id),
      };
    }
  }

  return null;
}

const images = assets.filter((a) => kindOf(a.content_type) === "image");
let candidates = images.filter((a) => {
  if (isSceneish(a)) return false;
  if (!isSingleWord(a.meta_item_name)) return false;
  return true;
});

if (LIMIT != null && Number.isFinite(LIMIT)) {
  candidates = candidates.slice(0, LIMIT);
}

const plan = {
  wouldLink: [],
  skipAlreadyLinked: [],
  unmatched: [],
  missingPlatform: [],
};

for (const asset of candidates) {
  const item = String(asset.meta_item_name || "").trim();
  const resolved = resolveLexicon(item);

  if (!resolved) {
    plan.unmatched.push({
      mediaId: asset.id,
      itemName: item,
      filename: asset.original_filename,
    });
    continue;
  }

  const pairKey = `${resolved.lexiconId}::${asset.id}`;
  if (alreadyLinkedIllustration.has(pairKey) || mediaAlreadyHasIllustration.has(asset.id)) {
    plan.skipAlreadyLinked.push({
      mediaId: asset.id,
      itemName: item,
      lexiconId: resolved.lexiconId,
      lemma: resolved.lemma,
    });
    continue;
  }

  if (resolved.missingPlatform) {
    plan.missingPlatform.push({
      mediaId: asset.id,
      itemName: item,
      lemma: resolved.lemma,
      lexiconId: resolved.lexiconId,
      candidates: resolved.candidates,
    });
  }

  plan.wouldLink.push({
    mediaId: asset.id,
    itemName: item,
    lexiconId: resolved.lexiconId,
    lemma: resolved.lemma,
    pos: resolved.pos,
    matchKey: resolved.matchKey,
    source: resolved.source,
    ambiguous: resolved.ambiguous,
    missingPlatform: Boolean(resolved.missingPlatform),
    candidates: resolved.ambiguous ? resolved.candidates : undefined,
    uploadedBy: asset.uploaded_by,
  });
}

const outDir = path.join(__dirname, "..", "tmp");
const reportPath = path.join(outDir, "chunk-a-lexicon-link-report.json");
try {
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: APPLY ? "apply" : "dry-run",
        counts: {
          imageCandidates: candidates.length,
          wouldLink: plan.wouldLink.length,
          skipAlreadyLinked: plan.skipAlreadyLinked.length,
          unmatched: plan.unmatched.length,
          missingPlatform: plan.missingPlatform.length,
          ambiguousAmongLinks: plan.wouldLink.filter((x) => x.ambiguous).length,
        },
        sampleWouldLink: plan.wouldLink.slice(0, 40),
        unmatched: plan.unmatched,
        missingPlatform: plan.missingPlatform,
        wouldLink: plan.wouldLink,
      },
      null,
      2,
    ),
  );
} catch {
  // tmp may not exist
}

console.log("\n=== Chunk A lexicon link ===");
console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`Single-word image candidates: ${candidates.length}`);
console.log(`Would link:                 ${plan.wouldLink.length}`);
console.log(`  (ambiguous POS pick):     ${plan.wouldLink.filter((x) => x.ambiguous).length}`);
console.log(`Skip already linked:        ${plan.skipAlreadyLinked.length}`);
console.log(`Unmatched (no lemma):       ${plan.unmatched.length}`);
console.log(`In search index, not DB:    ${plan.missingPlatform.length}`);
console.log(`Report: ${reportPath}`);

if (plan.unmatched.length) {
  console.log("\nUnmatched sample:");
  for (const u of plan.unmatched.slice(0, 25)) {
    console.log(`  - ${u.itemName} (${u.mediaId.slice(0, 8)}…)`);
  }
}

if (!APPLY) {
  console.log("\nRe-run with --apply to insert lexicon_media_links (role=illustration).");
  process.exit(0);
}

if (!plan.wouldLink.length) {
  console.log("Nothing to insert.");
  process.exit(0);
}

const rows = plan.wouldLink.map((x) => ({
  lexicon_id: x.lexiconId,
  media_asset_id: x.mediaId,
  role: "illustration",
  created_by: x.uploadedBy,
}));

const BATCH = 100;
let inserted = 0;
const errors = [];
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { data, error } = await admin
    .from("lexicon_media_links")
    .upsert(batch, { onConflict: "lexicon_id,media_asset_id,role", ignoreDuplicates: true })
    .select("id");
  if (error) {
    errors.push({ offset: i, message: error.message });
    console.error(`Batch @${i} failed:`, error.message);
  } else {
    inserted += data?.length || 0;
  }
}

console.log(`\nInserted (or confirmed): ${inserted}`);
if (errors.length) {
  console.log(`Batches with errors: ${errors.length}`);
  process.exit(1);
}
console.log("Done.");
