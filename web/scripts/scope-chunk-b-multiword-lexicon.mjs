/**
 * Chunk B dry-run: multi-word / phrase meta_item_name images → suggested dictionary links.
 * Never writes lexicon_media_links.
 *
 * Usage (from web/):
 *   node scripts/scope-chunk-b-multiword-lexicon.mjs
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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

const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with"]);

/** Tokens that usually mean the label is asset metadata, not a vocab phrase. */
const NOISE_TOKENS = new Set([
  "featured",
  "image",
  "crop",
  "transparent",
  "banner",
  "hotspot",
  "hotspots",
  "page",
  "cover",
  "walking",
  "ruined",
  "spilled",
  "waving",
  "aj",
  "mic",
]);

const NO_SINGULARIZE = new Set([
  "shorts",
  "pants",
  "jeans",
  "glasses",
  "scissors",
  "clothes",
  "octopus",
  "platypus",
  "walrus",
  "chips", // keep trying chip via irregular map
]);

const IRREGULAR_SINGULAR = {
  chips: "chip",
  boots: "boot",
  gloves: "glove",
  fries: "fry",
  animals: "animal",
  shirts: "shirt",
  trunks: "trunk",
  flops: "flop",
};

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

function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function kindOf(contentType) {
  const c = String(contentType || "").toLowerCase();
  if (c.startsWith("image/")) return "image";
  if (c.startsWith("audio/")) return "audio";
  return "other";
}

function isSceneish(asset) {
  const cats = (asset.meta_categories || []).map((s) => normalize(String(s)));
  const tags = (asset.meta_tags || []).map((s) => normalize(String(s)));
  if (cats.some((c) => ["scene", "sprite", "background", "prop"].includes(c))) return true;
  if (tags.some((t) => ["scene", "sprite", "background", "explore_hotspots"].includes(t))) {
    return true;
  }
  return false;
}

function isMultiWord(s) {
  const n = normalize(s);
  return Boolean(n) && n.includes(" ");
}

function pickBestLexicon(candidates, matchKey) {
  if (!candidates?.length) return null;
  if (candidates.length === 1) return candidates[0];
  const byPos = (pos) => candidates.find((c) => c.pos === pos);
  if (COLOR_LEMMAS.has(matchKey) && byPos("adjective")) return byPos("adjective");
  return byPos("noun") || byPos("adjective") || byPos("verb") || candidates[0];
}

function contentTokens(phrase) {
  return normalize(phrase)
    .split(" ")
    .filter((t) => t && !STOP.has(t));
}

function dropArticles(phrase) {
  const parts = normalize(phrase).split(" ");
  while (parts.length && STOP.has(parts[0])) parts.shift();
  return parts.join(" ");
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

/** normalizedLemma → entries[] */
const indexByLemma = new Map();
for (const e of searchIndex.entries || []) {
  const key = normalize(e.normalizedLemma || e.lemma);
  if (!key) continue;
  if (!indexByLemma.has(key)) indexByLemma.set(key, []);
  indexByLemma.get(key).push(e);
}

console.log("Loading media + existing links…");
const [assets, existingLinks, lexRows] = await Promise.all([
  fetchAll(
    "media_assets",
    "id, content_type, original_filename, meta_item_name, meta_alternative_names, meta_tags, meta_categories, public_url",
  ),
  fetchAll("lexicon_media_links", "media_asset_id, lexicon_id, role"),
  fetchAll("platform_lexicon_entries", "id, lemma, normalized, pos, status"),
]);

for (const r of lexRows) {
  if (r.status && r.status !== "published") continue;
  const key = normalize(r.normalized || r.lemma);
  if (!key) continue;
  if (!indexByLemma.has(key)) indexByLemma.set(key, []);
  // Prefer not to duplicate identical ids
  if (!indexByLemma.get(key).some((x) => x.id === r.id)) {
    indexByLemma.get(key).push({
      id: r.id,
      lemma: r.lemma,
      normalizedLemma: key,
      pos: r.pos,
    });
  }
}

const linkedIllustration = new Set(
  existingLinks.filter((l) => l.role === "illustration").map((l) => l.media_asset_id),
);

function simpleSingular(word) {
  const w = normalize(word);
  if (IRREGULAR_SINGULAR[w]) return IRREGULAR_SINGULAR[w];
  if (NO_SINGULARIZE.has(w)) return w;
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

function lookupLemma(key) {
  const k = normalize(key);
  if (!k) return null;
  const tryKeys = k === simpleSingular(k) ? [k] : [k, simpleSingular(k)];
  for (const tk of tryKeys) {
    const hits = indexByLemma.get(tk);
    if (!hits?.length) continue;
    const best = pickBestLexicon(hits, tk);
    return {
      lexiconId: best.id,
      lemma: best.lemma || best.normalizedLemma,
      pos: best.pos,
      matchKey: tk,
      ambiguousPos: hits.length > 1,
      allIds: hits.map((h) => `${h.id}(${h.pos})`),
    };
  }
  return null;
}

/**
 * Suggest links for a multi-word item name.
 * Returns { confidence, strategy, primary, alternatives, notes }
 */
function suggest(itemName, alts = []) {
  const phrase = normalize(itemName);
  const notes = [];
  const tried = [];
  const noiseHits = contentTokens(phrase).filter((t) => NOISE_TOKENS.has(t));
  if (noiseHits.length) {
    notes.push(`Noise tokens in label: ${noiseHits.join(", ")} — likely asset meta, not a vocab phrase.`);
  }

  // 1a) Exact phrase (and no-space compound) as dictionary lemma
  const phraseVariants = [phrase, dropArticles(phrase), phrase.replace(/ /g, "")].filter(
    (v, i, arr) => v && arr.indexOf(v) === i,
  );
  for (const v of phraseVariants) {
    tried.push(`exact:${v}`);
    const hit = lookupLemma(v);
    if (hit && (v.includes(" ") || v === phrase.replace(/ /g, "") || v === dropArticles(phrase))) {
      // bare lookupLemma on single-token dropArticles of multiword shouldn't happen often
      if (normalize(v) === phrase || normalize(v) === dropArticles(phrase) || !v.includes(" ")) {
        const isCompound = !v.includes(" ") && phrase.includes(" ");
        return {
          confidence: "exact_phrase",
          strategy: isCompound ? "compound_nospaces" : "exact_phrase",
          primary: hit,
          alternatives: [],
          notes: [
            ...notes,
            isCompound
              ? `Matched compound "${v}" (spaces removed) as dictionary lemma.`
              : `Matched full phrase "${v}" as a dictionary lemma.`,
          ],
          tried,
          reviewHint: "safe_to_link_after_spotcheck",
        };
      }
    }
    if (hit && (v === phrase || v === dropArticles(phrase))) {
      return {
        confidence: "exact_phrase",
        strategy: "exact_phrase",
        primary: hit,
        alternatives: [],
        notes: [...notes, `Matched full phrase "${v}" as a dictionary lemma.`],
        tried,
        reviewHint: "safe_to_link_after_spotcheck",
      };
    }
  }

  // 1b) Alternative names (weaker than phrase — often a head noun shortcut)
  for (const alt of alts.map((a) => normalize(a)).filter(Boolean)) {
    tried.push(`alt:${alt}`);
    const hit = lookupLemma(alt);
    if (hit) {
      return {
        confidence: "alt_name_match",
        strategy: "alternative_name",
        primary: hit,
        alternatives: [],
        notes: [
          ...notes,
          `Matched alternative name "${alt}" → ${hit.lemma}. Confirm the image is really that word.`,
        ],
        tried,
        reviewHint: "review_alt_vs_phrase",
      };
    }
  }

  const tokens = contentTokens(phrase);
  if (!tokens.length) {
    return {
      confidence: "none",
      strategy: "empty_tokens",
      primary: null,
      alternatives: [],
      notes: [...notes, "No content tokens after stripping stopwords."],
      tried,
      reviewHint: "skip_or_rename",
    };
  }

  const head = tokens[tokens.length - 1];
  tried.push(`head:${head}`);
  const headHit = lookupLemma(head);

  const tokenHits = [];
  for (const t of tokens) {
    tried.push(`token:${t}`);
    const hit = lookupLemma(t);
    if (hit) tokenHits.push({ token: t, ...hit });
  }

  const uniqueTokenHits = [];
  const seen = new Set();
  for (const h of tokenHits) {
    if (seen.has(h.lexiconId)) continue;
    seen.add(h.lexiconId);
    uniqueTokenHits.push(h);
  }

  if (noiseHits.length >= 1 && !headHit) {
    return {
      confidence: "skip_noise_label",
      strategy: "noise_meta",
      primary: uniqueTokenHits[0] || null,
      alternatives: uniqueTokenHits.slice(1),
      notes: [...notes, "Treat as non-vocab asset; do not auto-link."],
      tried,
      tokenHits: uniqueTokenHits,
      reviewHint: "skip",
    };
  }

  if (tokens.length === 2 && uniqueTokenHits.length === 2) {
    notes.push(
      `Both words exist: "${uniqueTokenHits[0].lemma}" + "${uniqueTokenHits[1].lemma}". Prefer head noun unless you want a new phrase lemma.`,
    );
    return {
      confidence: "ambiguous_both_words",
      strategy: "both_content_tokens",
      primary: headHit || uniqueTokenHits[1],
      alternatives: uniqueTokenHits.filter((h) => h.lexiconId !== (headHit || uniqueTokenHits[1]).lexiconId),
      notes,
      tried,
      tokenHits: uniqueTokenHits,
      reviewHint: "choose_head_or_add_phrase",
    };
  }

  if (headHit && uniqueTokenHits.length === 1) {
    notes.push(`Only head noun "${head}" found — suggested illustration link.`);
    return {
      confidence: "head_noun_only",
      strategy: "head_noun",
      primary: headHit,
      alternatives: [],
      notes,
      tried,
      tokenHits: uniqueTokenHits,
      reviewHint: noiseHits.length ? "review_noise_label" : "safe_to_link_after_spotcheck",
    };
  }

  if (headHit && uniqueTokenHits.length > 1) {
    notes.push(
      `Head noun "${head}" suggested; also matched: ${uniqueTokenHits.map((t) => t.lemma).join(", ")}.`,
    );
    return {
      confidence: "ambiguous_multi_token",
      strategy: "head_plus_other_tokens",
      primary: headHit,
      alternatives: uniqueTokenHits.filter((h) => h.lexiconId !== headHit.lexiconId),
      notes,
      tried,
      tokenHits: uniqueTokenHits,
      reviewHint: "manual_review",
    };
  }

  if (!headHit && uniqueTokenHits.length === 1) {
    notes.push(
      `Head noun "${head}" missing; only "${uniqueTokenHits[0].lemma}" found (weak).`,
    );
    return {
      confidence: "modifier_only_weak",
      strategy: "non_head_token",
      primary: uniqueTokenHits[0],
      alternatives: [],
      notes,
      tried,
      tokenHits: uniqueTokenHits,
      reviewHint: "prefer_add_head_lemma_or_skip",
    };
  }

  if (!headHit && uniqueTokenHits.length > 1) {
    notes.push("Head noun missing; multiple other hits — do not auto-link.");
    return {
      confidence: "ambiguous_no_head",
      strategy: "non_head_tokens",
      primary: null,
      alternatives: uniqueTokenHits,
      notes,
      tried,
      tokenHits: uniqueTokenHits,
      reviewHint: "manual_or_skip",
    };
  }

  notes.push(`No dictionary lemmas for tokens: ${tokens.join(", ")}`);
  return {
    confidence: "none",
    strategy: "no_match",
    primary: null,
    alternatives: [],
    notes,
    tried,
    tokenHits: [],
    suggestedNewLemma: phrase,
    reviewHint: "consider_new_phrase_or_head_lemma",
  };
}

const images = assets.filter((a) => kindOf(a.content_type) === "image");
const candidates = images.filter((a) => {
  if (isSceneish(a)) return false;
  if (!isMultiWord(a.meta_item_name)) return false;
  return true;
});

const rows = [];
const byConfidence = {};

for (const asset of candidates) {
  const itemName = String(asset.meta_item_name || "").trim();
  const alts = Array.isArray(asset.meta_alternative_names) ? asset.meta_alternative_names : [];
  const suggestion = suggest(itemName, alts);
  const alreadyLinked = linkedIllustration.has(asset.id);

  const row = {
    mediaId: asset.id,
    itemName,
    filename: asset.original_filename,
    publicUrl: asset.public_url,
    categories: asset.meta_categories || [],
    tags: (asset.meta_tags || []).slice(0, 8),
    alternativeNames: alts,
    alreadyHasIllustrationLink: alreadyLinked,
    confidence: suggestion.confidence,
    strategy: suggestion.strategy,
    notes: suggestion.notes,
    suggestedLink: suggestion.primary
      ? {
          lexiconId: suggestion.primary.lexiconId,
          lemma: suggestion.primary.lemma,
          pos: suggestion.primary.pos,
          matchKey: suggestion.primary.matchKey,
          ambiguousPos: suggestion.primary.ambiguousPos,
          role: "illustration",
        }
      : null,
    alternatives: (suggestion.alternatives || []).map((a) => ({
      lexiconId: a.lexiconId,
      lemma: a.lemma,
      pos: a.pos,
      token: a.token,
    })),
    tokenHits: (suggestion.tokenHits || []).map((t) => ({
      token: t.token,
      lexiconId: t.lexiconId,
      lemma: t.lemma,
      pos: t.pos,
    })),
    suggestedNewLemma: suggestion.suggestedNewLemma || null,
  };

  rows.push(row);
  byConfidence[suggestion.confidence] = (byConfidence[suggestion.confidence] || 0) + 1;
}

rows.sort((a, b) => {
  const order = [
    "exact_phrase",
    "head_noun_only",
    "ambiguous_both_words",
    "ambiguous_multi_token",
    "modifier_only_weak",
    "ambiguous_no_head",
    "none",
  ];
  const d = order.indexOf(a.confidence) - order.indexOf(b.confidence);
  if (d !== 0) return d;
  return a.itemName.localeCompare(b.itemName);
});

const reviewQueue = rows.map((r) => ({
  itemName: r.itemName,
  confidence: r.confidence,
  suggested: r.suggestedLink
    ? `${r.suggestedLink.lemma} (${r.suggestedLink.lexiconId})`
    : "(none)",
  alternatives: r.alternatives.map((a) => a.lemma).join(", ") || "—",
  notes: r.notes.join(" "),
  alreadyLinked: r.alreadyHasIllustrationLink,
}));

const outDir = path.join(__dirname, "..", "tmp");
mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, "chunk-b-multiword-lexicon-report.json");
const mdPath = path.join(outDir, "chunk-b-multiword-lexicon-report.md");

const report = {
  generatedAt: new Date().toISOString(),
  mode: "dry-run-review-only",
  note: "No lexicon_media_links were written.",
  counts: {
    multiWordImageCandidates: candidates.length,
    byConfidence,
    alreadyHasIllustrationLink: rows.filter((r) => r.alreadyHasIllustrationLink).length,
    withSuggestedLink: rows.filter((r) => r.suggestedLink).length,
    needsNewDictionaryLemma: rows.filter((r) => r.confidence === "none").length,
  },
  reviewQueue,
  rows,
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));

const mdLines = [
  "# Chunk B — multi-word / phrase media (dry-run)",
  "",
  `_Generated ${report.generatedAt}. No links written._`,
  "",
  `**Candidates:** ${candidates.length} non-scene images with multi-word \`meta_item_name\`.`,
  "",
  "## Confidence summary",
  "",
  "| Confidence | Count | Meaning |",
  "|---|---:|---|",
  `| exact_phrase | ${byConfidence.exact_phrase || 0} | Full phrase exists as a dictionary lemma |`,
  `| head_noun_only | ${byConfidence.head_noun_only || 0} | Only last content word matches — usually safe |`,
  `| ambiguous_both_words | ${byConfidence.ambiguous_both_words || 0} | Both words exist — pick head vs phrase sense |`,
  `| ambiguous_multi_token | ${byConfidence.ambiguous_multi_token || 0} | Head + other tokens match — review |`,
  `| modifier_only_weak | ${byConfidence.modifier_only_weak || 0} | Only a non-head word matches — weak |`,
  `| ambiguous_no_head | ${byConfidence.ambiguous_no_head || 0} | Head missing; multiple other hits — skip auto |`,
  `| none | ${byConfidence.none || 0} | No dictionary match — consider new lemma |`,
  "",
  "## Review table",
  "",
  "| Item name | Confidence | Suggested link | Alternatives | Notes |",
  "|---|---|---|---|---|",
];

for (const r of rows) {
  const sug = r.suggestedLink
    ? `\`${r.suggestedLink.lemma}\` / \`${r.suggestedLink.lexiconId}\``
    : "—";
  const alts = r.alternatives.length
    ? r.alternatives.map((a) => `\`${a.lemma}\``).join(", ")
    : "—";
  const notes = r.notes.join(" ").replace(/\|/g, "/");
  mdLines.push(
    `| ${r.itemName} | ${r.confidence} | ${sug} | ${alts} | ${notes} |`,
  );
}

mdLines.push(
  "",
  "## Suggested apply policy (for later)",
  "",
  "- Auto-link only `exact_phrase` and (optionally) `head_noun_only` after spot-check.",
  "- Manually decide `ambiguous_*` and `modifier_only_weak`.",
  "- Add phrase lemmas (e.g. `ice cream`) for `none` / phrase-sense cases before linking.",
  "",
);

writeFileSync(mdPath, mdLines.join("\n"));

console.log("\n=== Chunk B multi-word dry-run ===");
console.log(`Candidates: ${candidates.length}`);
console.log("By confidence:", byConfidence);
console.log(`With suggested link: ${rows.filter((r) => r.suggestedLink).length}`);
console.log(`Already illustration-linked: ${rows.filter((r) => r.alreadyHasIllustrationLink).length}`);
console.log(`\nJSON: ${reportPath}`);
console.log(`Markdown: ${mdPath}`);
console.log("\nReview queue:");
for (const r of reviewQueue) {
  console.log(
    `  [${r.confidence}] ${r.itemName} → ${r.suggested}${r.alternatives !== "—" ? ` (alts: ${r.alternatives})` : ""}`,
  );
}
