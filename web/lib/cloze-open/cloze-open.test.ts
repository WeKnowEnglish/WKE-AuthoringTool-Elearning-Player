import { describe, expect, it } from "vitest";
import {
  createSampleClozeOpenDocument,
  clozeOpenStubPack,
  isClozeOpenMastered,
  listClozeOpenGaps,
  scoreClozeOpenAnswers,
  validateClozeOpenDocument,
} from "@/lib/cloze-open";

describe("cloze open module", () => {
  it("validates the sample", () => {
    const doc = createSampleClozeOpenDocument();
    expect(listClozeOpenGaps(doc.segments)).toHaveLength(4);
    expect(clozeOpenStubPack(doc).kind).toBe("cloze-open-pack");
    expect(clozeOpenStubPack(doc).gap_count).toBe(4);
  });

  it("scores perfect and imperfect answers", () => {
    const doc = createSampleClozeOpenDocument();
    const gaps = listClozeOpenGaps(doc.segments);
    const options = {
      caseSensitive: doc.caseSensitive,
      punctuationSensitive: doc.punctuationSensitive,
    };
    const perfect = Object.fromEntries(
      gaps.map((gap) => [gap.id, gap.correctAnswers[0]!]),
    );
    expect(isClozeOpenMastered(scoreClozeOpenAnswers(doc.segments, perfect, options))).toBe(
      true,
    );

    const messy = {
      ...perfect,
      [gaps[0]!.id]: "  GARDEN! ",
    };
    expect(isClozeOpenMastered(scoreClozeOpenAnswers(doc.segments, messy, options))).toBe(
      true,
    );

    const wrong = { ...perfect, [gaps[0]!.id]: "park" };
    expect(isClozeOpenMastered(scoreClozeOpenAnswers(doc.segments, wrong, options))).toBe(
      false,
    );
  });

  it("rejects too few gaps", () => {
    expect(() =>
      validateClozeOpenDocument({
        version: 1,
        kind: "cloze-open",
        id: "short",
        title: "Short",
        instructions: "Fill.",
        caseSensitive: false,
        punctuationSensitive: false,
        segments: [
          { type: "text", id: "t1", text: "Hello " },
          { type: "gap", id: "g1", correctAnswers: ["a"] },
          { type: "text", id: "t2", text: " world " },
          { type: "gap", id: "g2", correctAnswers: ["c"] },
          { type: "text", id: "t3", text: "." },
        ],
      }),
    ).toThrow(/at least 3 gaps/);
  });
});
