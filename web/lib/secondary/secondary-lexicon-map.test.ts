import { describe, expect, it } from "vitest";
import {
  getSecondaryLexiconId,
  getSecondaryLexiconMapCounts,
  getSecondaryLexiconMapping,
  listSecondaryLexiconReviewQueue,
  listSecondaryLexiconUnmapped,
  secondaryEvidenceWordKey,
} from "@/lib/secondary/secondary-lexicon-map";
import { buildSecondaryToPrimaryLexiconMapDataset } from "@/lib/secondary/secondary-lexicon-map-build";
import type { SecondaryLexiconMapAuditReport } from "@/lib/secondary/secondary-to-primary-lexicon-audit";

describe("secondary-lexicon-map (generated dataset)", () => {
  it("exposes exact maps and review buckets", () => {
    const counts = getSecondaryLexiconMapCounts();
    expect(counts.total).toBe(240);
    expect(counts.mapped).toBe(164);
    expect(counts.pos_conflict).toBe(10);
    expect(counts.secondary_only).toBe(66);
    expect(listSecondaryLexiconReviewQueue()).toHaveLength(10);
    expect(listSecondaryLexiconUnmapped()).toHaveLength(66);
  });

  it("resolves known school-life subject → pv_subject_noun", () => {
    expect(getSecondaryLexiconId("g7-a2-school-life-subject")).toBe("pv_subject_noun");
    expect(getSecondaryLexiconMapping("g7-a2-school-life-subject")?.confidence).toBe(
      "exact",
    );
  });

  it("returns null for unmapped / unknown ids", () => {
    expect(getSecondaryLexiconId("g7-a2-school-life-geography")).toBeNull();
    expect(getSecondaryLexiconId("not-a-real-id")).toBeNull();
  });

  it("preferredKey uses lexicon id when mapped", () => {
    const mapped = secondaryEvidenceWordKey("g7-a2-school-life-subject");
    expect(mapped.lexiconId).toBe("pv_subject_noun");
    expect(mapped.preferredKey).toBe("pv_subject_noun");

    const unmapped = secondaryEvidenceWordKey("g7-a2-school-life-geography");
    expect(unmapped.lexiconId).toBeNull();
    expect(unmapped.preferredKey).toBe("g7-a2-school-life-geography");
  });
});

describe("buildSecondaryToPrimaryLexiconMapDataset", () => {
  it("splits exact into mappings and secondary_only into unmapped", () => {
    const report: SecondaryLexiconMapAuditReport = {
      generatedAt: "2026-01-01T00:00:00.000Z",
      secondaryPackId: "pack",
      secondaryPackVersion: "1",
      secondaryItemCount: 2,
      primaryEntryCount: 10,
      counts: {
        exact: 1,
        ambiguous_same_pos: 0,
        pos_conflict: 0,
        secondary_only: 1,
      },
      percents: {
        exact: 50,
        ambiguous_same_pos: 0,
        pos_conflict: 0,
        secondary_only: 50,
      },
      exactPrimaryIdCount: 1,
      byTopic: [],
      rows: [
        {
          wordItemId: "a",
          packId: "pack",
          topicId: "t",
          setId: "s",
          word: "run",
          lemma: "run",
          normalizedLemma: "run",
          rawPos: "verb",
          matchPos: "verb",
          status: "exact",
          primaryIds: ["pv_run_verb"],
          primarySummaries: [{ id: "pv_run_verb", lemma: "run", pos: "verb" }],
        },
        {
          wordItemId: "b",
          packId: "pack",
          topicId: "t",
          setId: "s",
          word: "zzz",
          lemma: "zzz",
          normalizedLemma: "zzz",
          rawPos: "noun",
          matchPos: "noun",
          status: "secondary_only",
          primaryIds: [],
          primarySummaries: [],
        },
      ],
    };

    const dataset = buildSecondaryToPrimaryLexiconMapDataset(report);
    expect(dataset.mappings).toHaveLength(1);
    expect(dataset.mappings[0]?.lexiconId).toBe("pv_run_verb");
    expect(dataset.unmapped).toHaveLength(1);
    expect(dataset.reviewQueue).toHaveLength(0);
  });
});
