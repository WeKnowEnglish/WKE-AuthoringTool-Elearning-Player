import { describe, expect, it } from "vitest";
import {
  applyEvidenceToMastery,
  applyEvidenceToMasteryRecords,
  createEmptyMasteryRecord,
  learningTargetKey,
} from "@/lib/mastery/engine";
import type { LearningEvidenceEvent, LearningTargetRef } from "@/lib/mastery/types";

const studentId = "student-1";
const target: LearningTargetRef = { type: "word", key: "Apple", label: "apple" };

function evidence(
  overrides: Partial<LearningEvidenceEvent> = {},
): LearningEvidenceEvent {
  return {
    id: `evidence-${Math.random()}`,
    studentId,
    sessionId: "session-1",
    occurredAt: "2026-07-04T08:00:00.000Z",
    source: "vocab_set",
    activityId: "vocab-food",
    itemId: "screen-1",
    targetRefs: [target],
    response: {
      kind: "type",
      success: true,
      firstTry: true,
      attempts: 1,
    },
    context: {
      scaffoldingLevel: "medium",
      evidenceMode: "recall",
      activityMode: "practice",
    },
    ...overrides,
  };
}

describe("mastery engine", () => {
  it("creates stable canonical target keys", () => {
    expect(learningTargetKey(target)).toBe("word:apple");
    expect(learningTargetKey({ type: "grammar", key: "There is / There are" })).toBe(
      "grammar:there-is-there-are",
    );
  });

  it("moves first successful exposure into introduced/practicing range", () => {
    const record = createEmptyMasteryRecord({ studentId, target });
    const next = applyEvidenceToMastery(record, evidence());

    expect(next.exposureCount).toBe(1);
    expect(next.retrievalSuccessCount).toBe(1);
    expect(next.masteryScore).toBeGreaterThan(0);
    expect(["introduced", "practicing"]).toContain(next.state);
    expect(next.nextReviewAt).toBeTruthy();
  });

  it("treats low-scaffold production success as stronger evidence than high-scaffold recognition", () => {
    const base = createEmptyMasteryRecord({ studentId, target });
    const highScaffold = applyEvidenceToMastery(
      base,
      evidence({
        response: { kind: "tap", success: true, firstTry: true, attempts: 1 },
        context: { scaffoldingLevel: "high", evidenceMode: "recognition" },
      }),
    );
    const lowScaffoldProduction = applyEvidenceToMastery(
      base,
      evidence({
        context: { scaffoldingLevel: "low", evidenceMode: "production" },
      }),
    );

    expect(lowScaffoldProduction.masteryScore).toBeGreaterThan(
      highScaffold.masteryScore,
    );
  });

  it("can become secure after repeated first-try productive retrievals", () => {
    let record = createEmptyMasteryRecord({ studentId, target });
    for (let i = 0; i < 4; i += 1) {
      record = applyEvidenceToMastery(
        record,
        evidence({
          id: `success-${i}`,
          occurredAt: `2026-07-0${i + 1}T08:00:00.000Z`,
          context: { scaffoldingLevel: "low", evidenceMode: "production" },
        }),
      );
    }

    expect(record.state).toBe("secure");
    expect(record.firstTrySuccessCount).toBe(4);
    expect(record.scaffoldingNeeded).toBe("low");
  });

  it("marks repeated failure as stuck with high scaffolding needed", () => {
    let record = createEmptyMasteryRecord({ studentId, target });
    for (let i = 0; i < 3; i += 1) {
      record = applyEvidenceToMastery(
        record,
        evidence({
          id: `miss-${i}`,
          response: {
            kind: "type",
            success: false,
            firstTry: false,
            attempts: 2,
            errorCode: "spelling",
          },
        }),
      );
    }

    expect(record.state).toBe("stuck");
    expect(record.scaffoldingNeeded).toBe("high");
    expect(record.commonErrorCodes).toContain("spelling");
  });

  it("updates all target and skill refs from one evidence event", () => {
    const next = applyEvidenceToMasteryRecords(
      {},
      evidence({
        skillRefs: [{ type: "skill", key: "vocabulary-recall" }],
      }),
    );

    expect(next["word:apple"]).toBeTruthy();
    expect(next["skill:vocabulary-recall"]).toBeTruthy();
  });
});

