import { describe, expect, it } from "vitest";
import { learningTargetKey } from "@/lib/mastery/engine";
import type { StudentMasteryRecord } from "@/lib/mastery/types";
import {
  getMasteryRecordForSecondaryWord,
  pickBestMasteryRecord,
  resolveSecondaryMasteryWordKeys,
} from "@/lib/secondary/secondary-mastery-keys";

function record(
  key: string,
  patch: Partial<StudentMasteryRecord> = {},
): StudentMasteryRecord {
  return {
    studentId: "s1",
    targetKey: key,
    targetType: "word",
    targetLabel: key,
    masteryScore: 0.2,
    state: "introduced",
    exposureCount: 1,
    retrievalSuccessCount: 1,
    retrievalFailureCount: 0,
    confidence: 0.2,
    scaffoldingNeeded: "medium",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...patch,
  };
}

describe("resolveSecondaryMasteryWordKeys", () => {
  it("dual-writes mapped Secondary ids", () => {
    const keys = resolveSecondaryMasteryWordKeys("g7-a2-school-life-subject");
    expect(keys.lexiconId).toBe("pv_subject_noun");
    expect(keys.preferredKey).toBe("pv_subject_noun");
    expect(keys.writeKeys).toEqual(["g7-a2-school-life-subject", "pv_subject_noun"]);
  });

  it("keeps unmapped ids legacy-only", () => {
    const keys = resolveSecondaryMasteryWordKeys("not-a-real-secondary-id");
    expect(keys.lexiconId).toBeNull();
    expect(keys.writeKeys).toEqual(["not-a-real-secondary-id"]);
  });
});

describe("getMasteryRecordForSecondaryWord", () => {
  it("reads lexicon-only records for a Secondary wordItemId", () => {
    const lexiconKey = learningTargetKey({ type: "word", key: "pv_subject_noun" });
    const records = {
      [lexiconKey]: record(lexiconKey, { masteryScore: 0.8, exposureCount: 4 }),
    };
    const found = getMasteryRecordForSecondaryWord(
      "g7-a2-school-life-subject",
      records,
    );
    expect(found?.masteryScore).toBe(0.8);
  });

  it("picks the stronger of legacy vs lexicon", () => {
    const legacyKey = learningTargetKey({
      type: "word",
      key: "g7-a2-school-life-subject",
    });
    const lexiconKey = learningTargetKey({ type: "word", key: "pv_subject_noun" });
    const records = {
      [legacyKey]: record(legacyKey, { masteryScore: 0.3, exposureCount: 2 }),
      [lexiconKey]: record(lexiconKey, { masteryScore: 0.7, exposureCount: 2 }),
    };
    expect(
      getMasteryRecordForSecondaryWord("g7-a2-school-life-subject", records)?.masteryScore,
    ).toBe(0.7);
  });
});

describe("pickBestMasteryRecord", () => {
  it("ignores nulls", () => {
    const a = record("word:a", { masteryScore: 0.4 });
    expect(pickBestMasteryRecord([null, a, undefined])?.targetKey).toBe("word:a");
  });
});
