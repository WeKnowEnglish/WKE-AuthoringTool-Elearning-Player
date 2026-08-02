import { describe, expect, it } from "vitest";
import {
  createSampleClozeChoiceDocument,
  clozeChoiceStubPack,
  isClozeChoiceMastered,
  listClozeChoiceGaps,
  scoreClozeChoiceAnswers,
  validateClozeChoiceDocument,
} from "@/lib/cloze-choice";

describe("cloze choice module", () => {
  it("validates the sample", () => {
    const doc = createSampleClozeChoiceDocument();
    expect(listClozeChoiceGaps(doc.segments)).toHaveLength(5);
    expect(clozeChoiceStubPack(doc).kind).toBe("cloze-choice-pack");
  });

  it("scores perfect and imperfect answers", () => {
    const doc = createSampleClozeChoiceDocument();
    const gaps = listClozeChoiceGaps(doc.segments);
    const perfect = Object.fromEntries(
      gaps.map((gap) => [gap.id, gap.correctAnswer]),
    );
    expect(isClozeChoiceMastered(scoreClozeChoiceAnswers(doc.segments, perfect))).toBe(
      true,
    );

    const messy = { ...perfect, [gaps[0]!.id]: gaps[0]!.options.find((o) => o !== gaps[0]!.correctAnswer)! };
    expect(isClozeChoiceMastered(scoreClozeChoiceAnswers(doc.segments, messy))).toBe(
      false,
    );
  });

  it("rejects too few gaps", () => {
    expect(() =>
      validateClozeChoiceDocument({
        version: 1,
        kind: "cloze-choice",
        id: "short",
        title: "Short",
        instructions: "Fill.",
        shuffleOptions: true,
        segments: [
          { type: "text", id: "t1", text: "Hello " },
          { type: "gap", id: "g1", options: ["a", "b"], correctAnswer: "a" },
          { type: "text", id: "t2", text: " world " },
          { type: "gap", id: "g2", options: ["c", "d"], correctAnswer: "c" },
          { type: "text", id: "t3", text: "." },
        ],
      }),
    ).toThrow(/at least 3 gaps/);
  });
});
