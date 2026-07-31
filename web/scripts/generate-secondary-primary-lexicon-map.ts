/**
 * Generate Secondary → Primary lexicon map + refresh audit artifacts.
 *
 * Usage: npm run generate:secondary-primary-lexicon-map
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSecondaryToPrimaryLexiconMapDataset,
  formatSecondaryLexiconMapMarkdown,
} from "../lib/secondary/secondary-lexicon-map-build.ts";
import {
  buildSecondaryToPrimaryLexiconAudit,
  formatSecondaryToPrimaryLexiconAuditMarkdown,
  type PrimaryLexiconAuditEntry,
} from "../lib/secondary/secondary-to-primary-lexicon-audit.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

const secondaryPath = path.join(webRoot, "g7-a2-complete-core-vocab-v1_2.json");
const primaryIndexRel =
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-search-index.v1.json";
const primaryIndexPath = path.join(webRoot, primaryIndexRel);

const mapDir = path.join(webRoot, "content/vocabulary/reference/secondary-lexicon");
const mapJsonPath = path.join(mapDir, "secondary-to-primary-lexicon-map.v1.json");
const mapMdPath = path.join(
  webRoot,
  "docs/mastery/SECONDARY_TO_PRIMARY_LEXICON_MAP.md",
);
const auditJsonPath = path.join(
  webRoot,
  "docs/mastery/secondary-to-primary-lexicon-map-audit.json",
);
const auditMdPath = path.join(
  webRoot,
  "docs/mastery/SECONDARY_TO_PRIMARY_LEXICON_MAP_AUDIT.md",
);

const secondaryPack = JSON.parse(fs.readFileSync(secondaryPath, "utf8"));
const primaryIndex = JSON.parse(fs.readFileSync(primaryIndexPath, "utf8")) as {
  entries: PrimaryLexiconAuditEntry[];
};

const report = buildSecondaryToPrimaryLexiconAudit({
  secondaryPack,
  primaryEntries: primaryIndex.entries,
});

const dataset = buildSecondaryToPrimaryLexiconMapDataset(report, {
  primaryIndexPath: primaryIndexRel.replace(/\\/g, "/"),
});

fs.mkdirSync(mapDir, { recursive: true });
fs.mkdirSync(path.dirname(mapMdPath), { recursive: true });

fs.writeFileSync(mapJsonPath, JSON.stringify(dataset, null, 2), "utf8");
fs.writeFileSync(mapMdPath, formatSecondaryLexiconMapMarkdown(dataset), "utf8");
fs.writeFileSync(auditJsonPath, JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(auditMdPath, formatSecondaryToPrimaryLexiconAuditMarkdown(report), "utf8");

console.log(
  `Mapped ${dataset.counts.mapped}/${dataset.counts.total} exact → ${mapJsonPath}`,
);
console.log(`Review queue: ${dataset.reviewQueue.length}`);
console.log(`Unmapped:     ${dataset.unmapped.length}`);
console.log(`Docs:         ${mapMdPath}`);
