#!/usr/bin/env node
/**
 * Rebuild the slim primary vocabulary search index from the full candidate JSON.
 *
 * Usage (from web/):
 *   node scripts/build-primary-vocabulary-search-index.mjs
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(
  root,
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-candidates.v1.json",
);
const out = join(
  root,
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-search-index.v1.json",
);

const dataset = JSON.parse(readFileSync(src, "utf8"));
if (!Array.isArray(dataset.entries)) {
  console.error("Dataset missing entries[]");
  process.exit(1);
}

const entries = dataset.entries.map((e) => ({
  id: e.id,
  lemma: e.lemma,
  normalizedLemma: e.normalizedLemma,
  pos: e.pos,
  cefrBandCandidate: e.cefrBandCandidate,
  primaryStageCandidate: e.primaryStageCandidate,
  primaryTopic: e.primaryTopic,
  topics: e.topics ?? [],
  vocabularyLane: e.vocabularyLane,
  status: e.status,
  reviewStatus: e.review?.status ?? "unreviewed",
}));

const index = {
  schemaVersion: 1,
  datasetVersion: dataset.datasetVersion,
  sourceDataset: "primary-vocabulary-candidates.v1.json",
  publicationStatus: dataset.publicationStatus,
  entryCount: entries.length,
  builtAt: new Date().toISOString().slice(0, 10),
  entries,
};

writeFileSync(out, `${JSON.stringify(index)}\n`);
const kb = (statSync(out).size / 1024).toFixed(1);
console.log(`Wrote ${entries.length} search-index rows (${kb} KB) → ${out}`);
