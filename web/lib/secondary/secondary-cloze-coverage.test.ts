import { describe, expect, it } from "vitest";
import {
  buildSecondaryClozeCoverageReport,
  classifySecondaryClozeTier,
  collectSecondaryClozeCoverageIssues,
  SECONDARY_CLOZE_TIER_AB_MIN_PERCENT,
  wordAppearsInExampleSentence,
} from "@/lib/secondary/secondary-cloze-coverage";
import {
  getCompleteSecondaryVocabPack,
  SECONDARY_VOCAB_PACK_ITEM_COUNT,
} from "@/lib/secondary/secondary-vocab-pack-loader";
import { getAllSecondaryVocabItems } from "@/lib/secondary/secondary-vocab-bank";
import type { SecondaryVocabItem } from "@/lib/secondary/types";

describe("secondary-cloze-coverage", () => {
  const pack = getCompleteSecondaryVocabPack();
  const items = getAllSecondaryVocabItems(pack);

  it("classifies cloze tiers consistently", () => {
    const framed: SecondaryVocabItem = {
      ...items[0]!,
      sentenceFrame: "I like ____.",
      exampleSentence: "I like school.",
    };
    expect(classifySecondaryClozeTier(framed)).toBe("A");

    const example: SecondaryVocabItem = {
      ...items[0]!,
      sentenceFrame: undefined,
      word: "subject",
      exampleSentence: "Science is my favorite subject.",
    };
    expect(classifySecondaryClozeTier(example)).toBe("B");
    expect(wordAppearsInExampleSentence(example)).toBe(true);

    const weak: SecondaryVocabItem = {
      ...items[0]!,
      sentenceFrame: undefined,
      word: "library",
      exampleSentence: "She reads books every day.",
    };
    expect(classifySecondaryClozeTier(weak)).toBe("C");
  });

  it("reports coverage for the full 240-word pack", () => {
    const report = buildSecondaryClozeCoverageReport(pack);
    expect(report.totalItems).toBe(SECONDARY_VOCAB_PACK_ITEM_COUNT);
    expect(report.counts.A + report.counts.B + report.counts.C + report.counts.D).toBe(
      SECONDARY_VOCAB_PACK_ITEM_COUNT,
    );
    expect(report.topics.length).toBeGreaterThan(0);
    expect(report.sets.length).toBeGreaterThan(0);
  });

  it(`meets Phase 6A tier A+B floor (${SECONDARY_CLOZE_TIER_AB_MIN_PERCENT}%)`, () => {
    const report = buildSecondaryClozeCoverageReport(pack);
    expect(report.tierABPercent).toBeGreaterThanOrEqual(SECONDARY_CLOZE_TIER_AB_MIN_PERCENT);
  });

  it("has no tier D on cloze-tagged items", () => {
    const issues = collectSecondaryClozeCoverageIssues(pack);
    expect(issues.filter((issue) => issue.code === "cloze_tier_d")).toEqual([]);
  });

  it("lists tier C items for ESL follow-up", () => {
    const report = buildSecondaryClozeCoverageReport(pack);
    for (const row of report.tierCItems) {
      expect(row.tier).toBe("C");
      expect(row.wordItemId.length).toBeGreaterThan(0);
    }
  });
});
