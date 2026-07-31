import { describe, expect, it } from "vitest";
import {
  buildPrimaryNormalizedIndex,
  buildSecondaryToPrimaryLexiconAudit,
  mapSecondaryItemToPrimary,
  secondaryRawPosToPrimaryPos,
} from "@/lib/secondary/secondary-to-primary-lexicon-audit";

const primary = [
  {
    id: "pv_subject_noun",
    lemma: "subject",
    normalizedLemma: "subject",
    pos: "noun",
  },
  {
    id: "pv_subject_verb",
    lemma: "subject",
    normalizedLemma: "subject",
    pos: "verb",
  },
  {
    id: "pv_run_verb",
    lemma: "run",
    normalizedLemma: "run",
    pos: "verb",
  },
  {
    id: "pv_look_after_phraseish",
    lemma: "look after",
    normalizedLemma: "look after",
    pos: "verb",
  },
];

describe("secondaryRawPosToPrimaryPos", () => {
  it("maps core POS and leaves phrases null", () => {
    expect(secondaryRawPosToPrimaryPos("noun")).toBe("noun");
    expect(secondaryRawPosToPrimaryPos("preposition")).toBe("preposition");
    expect(secondaryRawPosToPrimaryPos("phrasal verb")).toBeNull();
  });
});

describe("mapSecondaryItemToPrimary", () => {
  const index = buildPrimaryNormalizedIndex(primary);

  it("exact on lemma+POS", () => {
    const row = mapSecondaryItemToPrimary({
      wordItemId: "g7-a2-school-life-subject",
      packId: "pack",
      topicId: "school-life",
      setId: "s1",
      word: "subject",
      lemma: "subject",
      rawPos: "noun",
      primaryByNormalized: index,
    });
    expect(row.status).toBe("exact");
    expect(row.primaryIds).toEqual(["pv_subject_noun"]);
  });

  it("pos_conflict when lemma exists under other POS", () => {
    const row = mapSecondaryItemToPrimary({
      wordItemId: "x",
      packId: "pack",
      topicId: "t",
      setId: "s",
      word: "subject",
      lemma: "subject",
      rawPos: "adjective",
      primaryByNormalized: index,
    });
    expect(row.status).toBe("pos_conflict");
    expect(row.primaryIds).toContain("pv_subject_noun");
  });

  it("secondary_only when missing", () => {
    const row = mapSecondaryItemToPrimary({
      wordItemId: "x",
      packId: "pack",
      topicId: "t",
      setId: "s",
      word: "chromebook",
      lemma: "chromebook",
      rawPos: "noun",
      primaryByNormalized: index,
    });
    expect(row.status).toBe("secondary_only");
  });

  it("phrase unique lemma is exact", () => {
    const row = mapSecondaryItemToPrimary({
      wordItemId: "x",
      packId: "pack",
      topicId: "t",
      setId: "s",
      word: "look after",
      lemma: "look after",
      rawPos: "phrasal verb",
      primaryByNormalized: index,
    });
    expect(row.status).toBe("exact");
    expect(row.primaryIds[0]).toBe("pv_look_after_phraseish");
  });
});

describe("buildSecondaryToPrimaryLexiconAudit", () => {
  it("counts statuses", () => {
    const report = buildSecondaryToPrimaryLexiconAudit({
      secondaryPack: {
        metadata: { packId: "test-pack", version: "0.0.1" },
        topics: [
          {
            topicId: "t1",
            sets: [
              {
                setId: "s1",
                items: [
                  {
                    wordItemId: "a",
                    topicId: "t1",
                    setId: "s1",
                    word: "run",
                    lemma: "run",
                    partOfSpeech: "verb",
                  },
                  {
                    wordItemId: "b",
                    topicId: "t1",
                    setId: "s1",
                    word: "zzz",
                    lemma: "zzz",
                    partOfSpeech: "noun",
                  },
                ],
              },
            ],
          },
        ],
      },
      primaryEntries: primary,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(report.counts.exact).toBe(1);
    expect(report.counts.secondary_only).toBe(1);
    expect(report.secondaryItemCount).toBe(2);
  });
});
