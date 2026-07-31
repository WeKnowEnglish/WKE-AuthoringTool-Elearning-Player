/**
 * Audit Secondary core vocab pack → Primary candidate search index.
 *
 * Usage: npm run audit:secondary-primary-lexicon
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSecondaryToPrimaryLexiconAudit,
  formatSecondaryToPrimaryLexiconAuditMarkdown,
  type PrimaryLexiconAuditEntry,
} from "../lib/secondary/secondary-to-primary-lexicon-audit.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");

const secondaryPath = path.join(webRoot, "g7-a2-complete-core-vocab-v1_2.json");
const primaryIndexPath = path.join(
  webRoot,
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-search-index.v1.json",
);
const outDir = path.join(webRoot, "docs", "mastery");
const jsonOut = path.join(outDir, "secondary-to-primary-lexicon-map-audit.json");
const mdOut = path.join(outDir, "SECONDARY_TO_PRIMARY_LEXICON_MAP_AUDIT.md");

type PrimaryIndexFile = {
  entryCount?: number;
  entries: PrimaryLexiconAuditEntry[];
};

const secondaryPack = JSON.parse(fs.readFileSync(secondaryPath, "utf8")) as {
  metadata: { packId: string; version: string; itemCount?: number };
  topics: Array<{
    topicId: string;
    sets: Array<{
      setId: string;
      items: Array<{
        wordItemId: string;
        packId?: string;
        topicId: string;
        setId: string;
        word: string;
        lemma?: string;
        partOfSpeech: string;
      }>;
    }>;
  }>;
};

const primaryIndex = JSON.parse(
  fs.readFileSync(primaryIndexPath, "utf8"),
) as PrimaryIndexFile;

const report = buildSecondaryToPrimaryLexiconAudit({
  secondaryPack,
  primaryEntries: primaryIndex.entries,
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), "utf8");
fs.writeFileSync(mdOut, formatSecondaryToPrimaryLexiconAuditMarkdown(report), "utf8");

console.log(`Secondary pack: ${report.secondaryPackId} (${report.secondaryItemCount} items)`);
console.log(`Primary index:  ${report.primaryEntryCount} entries`);
console.log("");
console.log("Status counts:");
for (const status of [
  "exact",
  "ambiguous_same_pos",
  "pos_conflict",
  "secondary_only",
] as const) {
  console.log(
    `  ${status.padEnd(20)} ${String(report.counts[status]).padStart(4)}  (${report.percents[status]}%)`,
  );
}
console.log("");
console.log(`Wrote ${mdOut}`);
console.log(`Wrote ${jsonOut}`);
