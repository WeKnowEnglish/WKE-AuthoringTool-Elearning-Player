/**
 * Tag recent animal image uploads (empty metadata) for quiz / vocab lookup.
 *
 * Usage (from web/):
 *   node scripts/tag-recent-animal-media.mjs
 *   node scripts/tag-recent-animal-media.mjs --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  finalizeRowCategories,
  stemFromFilename,
} from "./finalize-media-metadata.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");

/** Filename stem → canonical display name + optional alt spellings. */
const STEM_OVERRIDES = {
  aligator: { item: "alligator", alt: ["aligator"] },
  "artic fox": { item: "arctic fox", alt: ["artic fox"] },
  gorrila: { item: "gorilla", alt: ["gorrila"] },
  lixzard: { item: "lizard", alt: ["lixzard"] },
  raoon: { item: "raccoon", alt: ["raoon"] },
  hippo: { item: "hippo", alt: ["hippopotamus"] },
  rhino: { item: "rhino", alt: ["rhinoceros"] },
  orca: { item: "orca", alt: ["killer whale"] },
  "sea turtle": { item: "sea turtle", alt: ["turtle"] },
  "polar bear": { item: "polar bear" },
  "red panda": { item: "red panda" },
  "komodo dragon": { item: "komodo dragon" },
};

const IRREGULAR_PLURALS = {
  fish: "fish",
  sheep: "sheep",
  deer: "deer",
  moose: "moose",
  mouse: "mice",
  goose: "geese",
  ox: "oxen",
};

function titleCaseWords(s) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function canonicalItemName(stem) {
  const o = STEM_OVERRIDES[stem];
  if (o?.item) return titleCaseWords(o.item);
  return titleCaseWords(stem);
}

function pluralFor(stem, itemName) {
  const key = stem.replace(/\s+/g, " ").trim();
  if (IRREGULAR_PLURALS[key]) return IRREGULAR_PLURALS[key];
  const base = itemName.toLowerCase();
  if (base.endsWith("s") || base.endsWith("x") || base.endsWith("ch") || base.endsWith("sh")) {
    return `${base}es`;
  }
  if (base.endsWith("y") && !/[aeiou]y$/i.test(base)) {
    return `${base.slice(0, -1)}ies`;
  }
  return `${base}s`;
}

function buildTags(stem, itemName, categories) {
  const tags = new Set(["vocabulary", "animals"]);
  const lemma = itemName.toLowerCase();
  tags.add(lemma);
  tags.add(stem);
  for (const c of categories) {
    if (c !== "animals" && c !== "misc") tags.add(c);
  }
  if (categories.includes("zoo")) tags.add("zoo");
  if (categories.includes("marine")) tags.add("marine");
  if (categories.includes("pets")) tags.add("pets");
  if (categories.includes("farm")) tags.add("farm");
  return [...tags].sort();
}

function buildMetadata(row) {
  const stem = stemFromFilename(row.original_filename);
  const itemName = canonicalItemName(stem);
  const categoryStem = (STEM_OVERRIDES[stem]?.item ?? stem).toLowerCase();
  const categories = finalizeRowCategories({
    original_filename: `${categoryStem}.png`,
    meta_item_name: itemName,
    meta_word_type: "noun",
    content_type: "image/png",
  });
  if (STEM_OVERRIDES[stem] && !categories.includes("animals")) {
    categories.unshift("animals");
  }
  const alt = new Set(STEM_OVERRIDES[stem]?.alt ?? []);
  alt.add(stem);
  if (stem !== itemName.toLowerCase()) alt.add(itemName.toLowerCase());

  return {
    meta_item_name: itemName,
    meta_categories: categories,
    meta_tags: buildTags(stem, itemName, categories),
    meta_alternative_names: [...alt].filter((a) => a && a !== itemName.toLowerCase()).sort(),
    meta_plural: pluralFor(stem, itemName),
    meta_countability: "countable",
    meta_level: "a1",
    meta_word_type: "noun",
    meta_skills: ["reading", "listening"],
    meta_past_tense: null,
    meta_notes: "Auto-tagged for animals quiz / vocab (2026-05-20).",
  };
}

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL/key missing in .env.local");
  return { url, key };
}

async function main() {
  const { url, key } = loadEnv();
  const sb = createClient(url, key);

  const { data, error } = await sb
    .from("media_assets")
    .select("id,original_filename,meta_item_name,meta_categories,public_url,created_at")
    .like("content_type", "image/%")
    .gte("created_at", "2026-05-19T00:00:00Z")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []).filter(
    (r) => !r.meta_item_name || !(r.meta_categories ?? []).length,
  );

  console.log(`Found ${rows.length} assets to tag${dryRun ? " (dry run)" : ""}.`);

  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const patch = buildMetadata(row);
    if (dryRun) {
      console.log(`${row.original_filename} →`, patch.meta_item_name, patch.meta_categories);
      continue;
    }
    const { error: upErr } = await sb.from("media_assets").update(patch).eq("id", row.id);
    if (upErr) {
      console.error("FAIL", row.original_filename, upErr.message);
      failed += 1;
    } else {
      updated += 1;
    }
  }

  if (!dryRun) {
    console.log(`Updated ${updated}, failed ${failed}.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
