/**
 * Audit: Secondary pack items → Primary vocabulary candidates (pv_*).
 * Mapping signal only — does not write IDs or change runtime.
 */

import { normalizeLexiconSurface } from "@/lib/vocabulary/teacher-lexicon/normalize";
import type { PartOfSpeech } from "@/lib/vocabulary/primary-candidates/types";
import type { SecondaryVocabPack } from "@/lib/secondary/types";

export type PrimaryLexiconAuditEntry = {
  id: string;
  lemma: string;
  normalizedLemma: string;
  pos: string;
  cefrBandCandidate?: string;
  primaryStageCandidate?: string;
  primaryTopic?: string;
};

export type SecondaryLexiconMapStatus =
  | "exact"
  | "ambiguous_same_pos"
  | "pos_conflict"
  | "secondary_only";

export type SecondaryLexiconMapRow = {
  wordItemId: string;
  packId: string;
  topicId: string;
  setId: string;
  word: string;
  lemma: string;
  normalizedLemma: string;
  /** Raw pack POS string (before Secondary loader remaps). */
  rawPos: string;
  /** POS used for Primary match (null when multiword / phrase-like). */
  matchPos: PartOfSpeech | null;
  status: SecondaryLexiconMapStatus;
  /** Chosen or candidate Primary ids. */
  primaryIds: string[];
  primarySummaries: Array<{
    id: string;
    lemma: string;
    pos: string;
    cefrBandCandidate?: string;
    primaryStageCandidate?: string;
    primaryTopic?: string;
  }>;
  note?: string;
};

export type SecondaryLexiconMapAuditReport = {
  generatedAt: string;
  secondaryPackId: string;
  secondaryPackVersion: string;
  secondaryItemCount: number;
  primaryEntryCount: number;
  counts: Record<SecondaryLexiconMapStatus, number>;
  percents: Record<SecondaryLexiconMapStatus, number>;
  /** Unique Primary ids that appear in at least one exact match. */
  exactPrimaryIdCount: number;
  byTopic: Array<{
    topicId: string;
    total: number;
    exact: number;
    ambiguous_same_pos: number;
    pos_conflict: number;
    secondary_only: number;
  }>;
  rows: SecondaryLexiconMapRow[];
};

/** Map Secondary pack POS strings onto Primary POS when safe. */
export function secondaryRawPosToPrimaryPos(rawPos: string): PartOfSpeech | null {
  const key = rawPos.trim().toLowerCase();
  switch (key) {
    case "noun":
      return "noun";
    case "verb":
      return "verb";
    case "adjective":
      return "adjective";
    case "adverb":
      return "adverb";
    case "preposition":
      return "preposition";
    case "conjunction":
      return "conjunction";
    case "pronoun":
      return "pronoun";
    case "determiner":
      return "determiner";
    case "modal":
      return "modal";
    case "number":
      return "number";
    case "interjection":
      return "interjection";
    case "particle":
      return "particle";
    // Phrase-like: match on lemma only (no POS filter).
    case "phrase":
    case "noun phrase":
    case "verb phrase":
    case "phrasal verb":
      return null;
    default:
      return null;
  }
}

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 1000) / 10;
}

function summarize(entry: PrimaryLexiconAuditEntry) {
  return {
    id: entry.id,
    lemma: entry.lemma,
    pos: entry.pos,
    cefrBandCandidate: entry.cefrBandCandidate,
    primaryStageCandidate: entry.primaryStageCandidate,
    primaryTopic: entry.primaryTopic,
  };
}

/**
 * Resolve one Secondary item against Primary candidates.
 * Prefer unique lemma+POS; else unique lemma when POS is phrase-like;
 * else pos_conflict when lemma hits other POS; else secondary_only.
 */
export function mapSecondaryItemToPrimary(input: {
  wordItemId: string;
  packId: string;
  topicId: string;
  setId: string;
  word: string;
  lemma: string;
  rawPos: string;
  primaryByNormalized: Map<string, PrimaryLexiconAuditEntry[]>;
}): SecondaryLexiconMapRow {
  const normalizedLemma = normalizeLexiconSurface(input.lemma || input.word);
  const normalizedWord = normalizeLexiconSurface(input.word);
  const matchPos = secondaryRawPosToPrimaryPos(input.rawPos);

  const byLemma =
    input.primaryByNormalized.get(normalizedLemma) ??
    (normalizedWord !== normalizedLemma
      ? input.primaryByNormalized.get(normalizedWord)
      : undefined) ??
    [];

  const base = {
    wordItemId: input.wordItemId,
    packId: input.packId,
    topicId: input.topicId,
    setId: input.setId,
    word: input.word,
    lemma: input.lemma || input.word,
    normalizedLemma,
    rawPos: input.rawPos,
    matchPos,
  };

  if (byLemma.length === 0) {
    return {
      ...base,
      status: "secondary_only",
      primaryIds: [],
      primarySummaries: [],
      note: "No Primary candidate with this normalized lemma/surface.",
    };
  }

  if (matchPos) {
    const samePos = byLemma.filter((e) => e.pos === matchPos);
    if (samePos.length === 1) {
      return {
        ...base,
        status: "exact",
        primaryIds: [samePos[0]!.id],
        primarySummaries: [summarize(samePos[0]!)],
      };
    }
    if (samePos.length > 1) {
      return {
        ...base,
        status: "ambiguous_same_pos",
        primaryIds: samePos.map((e) => e.id),
        primarySummaries: samePos.map(summarize),
        note: `Multiple Primary senses for lemma+${matchPos}.`,
      };
    }
    return {
      ...base,
      status: "pos_conflict",
      primaryIds: byLemma.map((e) => e.id),
      primarySummaries: byLemma.map(summarize),
      note: `Lemma exists in Primary as ${[...new Set(byLemma.map((e) => e.pos))].join(", ")}, not ${matchPos}.`,
    };
  }

  // Phrase-like: exact only if a single Primary lemma hit (any POS).
  if (byLemma.length === 1) {
    return {
      ...base,
      status: "exact",
      primaryIds: [byLemma[0]!.id],
      primarySummaries: [summarize(byLemma[0]!)],
      note: "Phrase-like Secondary POS; unique Primary lemma hit (POS not enforced).",
    };
  }

  return {
    ...base,
    status: "ambiguous_same_pos",
    primaryIds: byLemma.map((e) => e.id),
    primarySummaries: byLemma.map(summarize),
    note: "Phrase-like Secondary POS; multiple Primary lemma hits — pick sense manually.",
  };
}

export function buildPrimaryNormalizedIndex(
  entries: readonly PrimaryLexiconAuditEntry[],
): Map<string, PrimaryLexiconAuditEntry[]> {
  const map = new Map<string, PrimaryLexiconAuditEntry[]>();
  for (const entry of entries) {
    const key = normalizeLexiconSurface(entry.normalizedLemma || entry.lemma);
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return map;
}

type RawPackItem = {
  wordItemId: string;
  packId?: string;
  topicId: string;
  setId: string;
  word: string;
  lemma?: string;
  partOfSpeech: string;
};

type RawPack = {
  metadata: { packId: string; version: string; itemCount?: number };
  topics: Array<{
    topicId: string;
    sets: Array<{ setId: string; items: RawPackItem[] }>;
  }>;
};

/** Audit from raw Secondary JSON (preserves pack POS) + Primary search-index entries. */
export function buildSecondaryToPrimaryLexiconAudit(input: {
  secondaryPack: RawPack;
  primaryEntries: readonly PrimaryLexiconAuditEntry[];
  generatedAt?: string;
}): SecondaryLexiconMapAuditReport {
  const primaryByNormalized = buildPrimaryNormalizedIndex(input.primaryEntries);
  const packId = input.secondaryPack.metadata.packId;
  const rows: SecondaryLexiconMapRow[] = [];

  for (const topic of input.secondaryPack.topics) {
    for (const set of topic.sets) {
      for (const item of set.items) {
        rows.push(
          mapSecondaryItemToPrimary({
            wordItemId: item.wordItemId,
            packId: item.packId ?? packId,
            topicId: item.topicId || topic.topicId,
            setId: item.setId || set.setId,
            word: item.word,
            lemma: item.lemma ?? item.word,
            rawPos: item.partOfSpeech,
            primaryByNormalized,
          }),
        );
      }
    }
  }

  const counts: Record<SecondaryLexiconMapStatus, number> = {
    exact: 0,
    ambiguous_same_pos: 0,
    pos_conflict: 0,
    secondary_only: 0,
  };
  for (const row of rows) counts[row.status] += 1;

  const total = rows.length;
  const percents: Record<SecondaryLexiconMapStatus, number> = {
    exact: pct(counts.exact, total),
    ambiguous_same_pos: pct(counts.ambiguous_same_pos, total),
    pos_conflict: pct(counts.pos_conflict, total),
    secondary_only: pct(counts.secondary_only, total),
  };

  const exactPrimaryIds = new Set(
    rows.filter((r) => r.status === "exact").flatMap((r) => r.primaryIds),
  );

  const topicIds = [...new Set(rows.map((r) => r.topicId))];
  const byTopic = topicIds.map((topicId) => {
    const topicRows = rows.filter((r) => r.topicId === topicId);
    const bucket = {
      topicId,
      total: topicRows.length,
      exact: 0,
      ambiguous_same_pos: 0,
      pos_conflict: 0,
      secondary_only: 0,
    };
    for (const r of topicRows) bucket[r.status] += 1;
    return bucket;
  });

  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    secondaryPackId: packId,
    secondaryPackVersion: input.secondaryPack.metadata.version,
    secondaryItemCount: total,
    primaryEntryCount: input.primaryEntries.length,
    counts,
    percents,
    exactPrimaryIdCount: exactPrimaryIds.size,
    byTopic,
    rows,
  };
}

/** Optional: audit from already-normalized SecondaryVocabPack (POS already remapped). */
export function buildSecondaryToPrimaryLexiconAuditFromPack(
  pack: SecondaryVocabPack,
  primaryEntries: readonly PrimaryLexiconAuditEntry[],
): SecondaryLexiconMapAuditReport {
  const raw: RawPack = {
    metadata: {
      packId: pack.metadata.packId,
      version: pack.metadata.version,
      itemCount: pack.metadata.itemCount,
    },
    topics: pack.topics.map((topic) => ({
      topicId: topic.topicId,
      sets: topic.sets.map((set) => ({
        setId: set.setId,
        items: set.items.map((item) => ({
          wordItemId: item.wordItemId,
          packId: item.packId,
          topicId: item.topicId,
          setId: item.setId,
          word: item.word,
          lemma: item.lemma,
          partOfSpeech: item.partOfSpeech,
        })),
      })),
    })),
  };
  return buildSecondaryToPrimaryLexiconAudit({ secondaryPack: raw, primaryEntries });
}

export function formatSecondaryToPrimaryLexiconAuditMarkdown(
  report: SecondaryLexiconMapAuditReport,
): string {
  const lines: string[] = [];
  lines.push(`# Secondary → Primary lexicon mapping audit`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push(`| Source | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Secondary pack | \`${report.secondaryPackId}\` v${report.secondaryPackVersion} |`);
  lines.push(`| Secondary items | ${report.secondaryItemCount} |`);
  lines.push(`| Primary candidates (search index) | ${report.primaryEntryCount} |`);
  lines.push(`| Unique Primary ids in exact matches | ${report.exactPrimaryIdCount} |`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Status | Count | % |`);
  lines.push(`|--------|------:|--:|`);
  lines.push(
    `| **exact** (unique lemma+POS, or unique lemma for phrases) | ${report.counts.exact} | ${report.percents.exact}% |`,
  );
  lines.push(
    `| **ambiguous_same_pos** (needs sense pick) | ${report.counts.ambiguous_same_pos} | ${report.percents.ambiguous_same_pos}% |`,
  );
  lines.push(
    `| **pos_conflict** (lemma in Primary, different POS) | ${report.counts.pos_conflict} | ${report.percents.pos_conflict}% |`,
  );
  lines.push(
    `| **secondary_only** (no Primary lemma hit) | ${report.counts.secondary_only} | ${report.percents.secondary_only}% |`,
  );
  lines.push("");
  lines.push(
    `High-confidence auto-map pool ≈ **exact** (${report.counts.exact}). Review queue ≈ ambiguous + pos_conflict (${report.counts.ambiguous_same_pos + report.counts.pos_conflict}). New dictionary candidates ≈ secondary_only (${report.counts.secondary_only}).`,
  );
  lines.push("");
  lines.push(`## By topic`);
  lines.push("");
  lines.push(`| Topic | Total | Exact | Ambiguous | POS conflict | Secondary-only |`);
  lines.push(`|-------|------:|------:|----------:|-------------:|---------------:|`);
  for (const t of report.byTopic) {
    lines.push(
      `| ${t.topicId} | ${t.total} | ${t.exact} | ${t.ambiguous_same_pos} | ${t.pos_conflict} | ${t.secondary_only} |`,
    );
  }

  const listSection = (
    title: string,
    status: SecondaryLexiconMapStatus,
    limit = 40,
  ) => {
    const rows = report.rows.filter((r) => r.status === status);
    lines.push("");
    lines.push(`## ${title} (${rows.length})`);
    lines.push("");
    if (rows.length === 0) {
      lines.push("_None._");
      return;
    }
    lines.push(`| wordItemId | word | POS | Primary |`);
    lines.push(`|------------|------|-----|---------|`);
    for (const r of rows.slice(0, limit)) {
      const primary =
        r.primarySummaries.length === 0
          ? "—"
          : r.primarySummaries.map((p) => `${p.id} (${p.pos})`).join(", ");
      lines.push(
        `| \`${r.wordItemId}\` | ${r.word} | ${r.rawPos} | ${primary} |`,
      );
    }
    if (rows.length > limit) {
      lines.push("");
      lines.push(`_…and ${rows.length - limit} more (see JSON)._`);
    }
  };

  listSection("Secondary-only (candidates for new pv_*)", "secondary_only");
  listSection("POS conflicts (manual confirm)", "pos_conflict");
  listSection("Ambiguous same POS / multi-hit", "ambiguous_same_pos");

  lines.push("");
  lines.push(`## Exact matches (sample)`);
  lines.push("");
  const exact = report.rows.filter((r) => r.status === "exact");
  lines.push(`Showing first 25 of ${exact.length}.`);
  lines.push("");
  lines.push(`| wordItemId | word | → Primary |`);
  lines.push(`|------------|------|-----------|`);
  for (const r of exact.slice(0, 25)) {
    lines.push(
      `| \`${r.wordItemId}\` | ${r.word} | \`${r.primaryIds[0]}\` |`,
    );
  }

  lines.push("");
  lines.push(`## How to re-run`);
  lines.push("");
  lines.push("```bash");
  lines.push("npm run generate:secondary-primary-lexicon-map");
  lines.push("# or audit-only:");
  lines.push("npm run audit:secondary-primary-lexicon");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}
