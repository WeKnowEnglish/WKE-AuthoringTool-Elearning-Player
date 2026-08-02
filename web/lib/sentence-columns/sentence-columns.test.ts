import { describe, expect, it } from "vitest";
import {
  createSampleSentenceColumnsDocument,
  scoreSentenceColumnsAnswers,
  sentenceColumnsStubPack,
  validateSentenceColumnsDocument,
} from "@/lib/sentence-columns";

describe("sentence columns module", () => {
  it("validates the HT1 sample", () => {
    const doc = createSampleSentenceColumnsDocument();
    expect(doc.challenges).toHaveLength(4);
    expect(sentenceColumnsStubPack(doc).kind).toBe("sentence-columns-pack");
  });

  it("scores placements by columnId", () => {
    const doc = createSampleSentenceColumnsDocument();
    const challenge = doc.challenges[0]!;
    const placements = Object.fromEntries(
      challenge.pieces.map((piece) => [piece.id, piece.columnId]),
    );
    expect(scoreSentenceColumnsAnswers([challenge], placements)).toEqual({
      correct: 3,
      total: 3,
    });
    expect(
      scoreSentenceColumnsAnswers([challenge], {
        [challenge.pieces[0]!.id]: "subject",
      }),
    ).toEqual({ correct: 0, total: 3 });
  });

  it("rejects challenges missing a column piece", () => {
    expect(() =>
      validateSentenceColumnsDocument({
        ...createSampleSentenceColumnsDocument(),
        challenges: [
          {
            id: "bad",
            pieces: [
              { id: "a", text: "A", columnId: "subject" },
              { id: "b", text: "B", columnId: "action" },
              { id: "c", text: "C", columnId: "action" },
            ],
          },
        ],
      }),
    ).toThrow(/each column/);
  });
});
