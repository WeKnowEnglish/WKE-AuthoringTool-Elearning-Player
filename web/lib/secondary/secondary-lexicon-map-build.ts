import type {
  SecondaryLexiconMappedEntry,
  SecondaryLexiconReviewEntry,
  SecondaryToPrimaryLexiconMapDataset,
} from "@/lib/secondary/secondary-lexicon-map-types";
import type { SecondaryLexiconMapAuditReport } from "@/lib/secondary/secondary-to-primary-lexicon-audit";

export const SECONDARY_LEXICON_MAP_DATASET_VERSION = "1.0.0";
export const SECONDARY_LEXICON_MAP_METHOD = "exact_lemma_pos_v1" as const;

/** Build the durable mapping dataset from an audit report (exact → mapped). */
export function buildSecondaryToPrimaryLexiconMapDataset(
  report: SecondaryLexiconMapAuditReport,
  options?: {
    datasetVersion?: string;
    primaryIndexPath?: string;
    title?: string;
  },
): SecondaryToPrimaryLexiconMapDataset {
  const mappings: SecondaryLexiconMappedEntry[] = [];
  const reviewQueue: SecondaryLexiconReviewEntry[] = [];
  const unmapped: SecondaryLexiconReviewEntry[] = [];

  for (const row of report.rows) {
    if (row.status === "exact") {
      if (row.primaryIds[0]) {
        mappings.push({
          wordItemId: row.wordItemId,
          lexiconId: row.primaryIds[0],
          status: "mapped",
          confidence: "exact",
          lemma: row.lemma,
          rawPos: row.rawPos,
          matchPos: row.matchPos,
          topicId: row.topicId,
          setId: row.setId,
        });
      }
      continue;
    }

    const review: SecondaryLexiconReviewEntry = {
      wordItemId: row.wordItemId,
      status: row.status,
      lemma: row.lemma,
      word: row.word,
      rawPos: row.rawPos,
      matchPos: row.matchPos,
      topicId: row.topicId,
      setId: row.setId,
      candidateLexiconIds: row.primaryIds,
      note: row.note,
    };

    if (row.status === "secondary_only") unmapped.push(review);
    else reviewQueue.push(review);
  }

  mappings.sort((a, b) => a.wordItemId.localeCompare(b.wordItemId));
  reviewQueue.sort((a, b) => a.wordItemId.localeCompare(b.wordItemId));
  unmapped.sort((a, b) => a.wordItemId.localeCompare(b.wordItemId));

  return {
    schemaVersion: 1,
    datasetVersion: options?.datasetVersion ?? SECONDARY_LEXICON_MAP_DATASET_VERSION,
    title: options?.title ?? "Secondary wordItemId → Primary lexicon (pv_*) map",
    secondaryPackId: report.secondaryPackId,
    secondaryPackVersion: report.secondaryPackVersion,
    primaryIndexPath:
      options?.primaryIndexPath ??
      "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-search-index.v1.json",
    primaryEntryCount: report.primaryEntryCount,
    method: SECONDARY_LEXICON_MAP_METHOD,
    generatedAt: report.generatedAt,
    counts: {
      mapped: mappings.length,
      pos_conflict: report.counts.pos_conflict,
      secondary_only: report.counts.secondary_only,
      ambiguous_same_pos: report.counts.ambiguous_same_pos,
      total: report.secondaryItemCount,
    },
    mappings,
    reviewQueue,
    unmapped,
  };
}

export function formatSecondaryLexiconMapMarkdown(
  dataset: SecondaryToPrimaryLexiconMapDataset,
): string {
  const lines: string[] = [];
  lines.push(`# Secondary → Primary lexicon map (Phase 1)`);
  lines.push("");
  lines.push(`Generated: ${dataset.generatedAt}`);
  lines.push("");
  lines.push(
    `Stable mapping table from Secondary \`wordItemId\` → Primary candidate \`pv_*\`. Runtime mastery still keys on \`wordItemId\`; this file is the bridge for media, dictionary, and future dual-key mastery.`,
  );
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Dataset | v${dataset.datasetVersion} |`);
  lines.push(`| Method | \`${dataset.method}\` |`);
  lines.push(`| Secondary pack | \`${dataset.secondaryPackId}\` v${dataset.secondaryPackVersion} |`);
  lines.push(`| Mapped (exact) | **${dataset.counts.mapped}** / ${dataset.counts.total} |`);
  lines.push(`| Review (POS conflict / ambiguous) | ${dataset.reviewQueue.length} |`);
  lines.push(`| Unmapped (Secondary-only) | ${dataset.unmapped.length} |`);
  lines.push("");
  lines.push(`## How to use`);
  lines.push("");
  lines.push("```ts");
  lines.push(`import { getSecondaryLexiconId } from "@/lib/secondary/secondary-lexicon-map";`);
  lines.push(`getSecondaryLexiconId("g7-a2-school-life-subject"); // "pv_subject_noun"`);
  lines.push("```");
  lines.push("");
  lines.push(`## Review queue (${dataset.reviewQueue.length})`);
  lines.push("");
  if (dataset.reviewQueue.length === 0) {
    lines.push("_None._");
  } else {
    lines.push(`| wordItemId | word | Secondary POS | Candidates | Note |`);
    lines.push(`|------------|------|---------------|------------|------|`);
    for (const row of dataset.reviewQueue) {
      lines.push(
        `| \`${row.wordItemId}\` | ${row.word} | ${row.rawPos} | ${row.candidateLexiconIds.join(", ") || "—"} | ${row.note ?? ""} |`,
      );
    }
  }
  lines.push("");
  lines.push(`## Unmapped — promote as new dictionary entries (${dataset.unmapped.length})`);
  lines.push("");
  lines.push(`Showing first 40; full list in JSON.`);
  lines.push("");
  lines.push(`| wordItemId | word | POS | Topic |`);
  lines.push(`|------------|------|-----|-------|`);
  for (const row of dataset.unmapped.slice(0, 40)) {
    lines.push(
      `| \`${row.wordItemId}\` | ${row.word} | ${row.rawPos} | ${row.topicId} |`,
    );
  }
  if (dataset.unmapped.length > 40) {
    lines.push("");
    lines.push(`_…and ${dataset.unmapped.length - 40} more._`);
  }
  lines.push("");
  lines.push(`## Regenerate`);
  lines.push("");
  lines.push("```bash");
  lines.push("npm run generate:secondary-primary-lexicon-map");
  lines.push("```");
  lines.push("");
  lines.push(`Also refreshes the audit report via the same matcher.`);
  lines.push("");
  return lines.join("\n");
}
