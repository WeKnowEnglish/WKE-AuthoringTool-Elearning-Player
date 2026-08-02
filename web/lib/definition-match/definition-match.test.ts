import { describe, expect, it } from "vitest";
import {
  compileDefinitionMatchFromVocabList,
  createSampleDefinitionMatchDocument,
  definitionMatchStubPack,
  isDefinitionMatchMastered,
  scoreDefinitionMatchAnswers,
  validateDefinitionMatchDocument,
} from "@/lib/definition-match";
import { createHobbiesVocabularyListDocument } from "@/lib/learning-tracks/create-hobbies-vocabulary-list";

describe("definition match module", () => {
  it("validates the sample", () => {
    const doc = createSampleDefinitionMatchDocument();
    expect(doc.pairs.length).toBeGreaterThanOrEqual(4);
    expect(definitionMatchStubPack(doc).kind).toBe("definition-match-pack");
  });

  it("scores perfect and imperfect placements", () => {
    const doc = createSampleDefinitionMatchDocument();
    const perfect = Object.fromEntries(doc.pairs.map((pair) => [pair.id, pair.id]));
    const score = scoreDefinitionMatchAnswers(doc.pairs, perfect);
    expect(score.correct).toBe(score.total);
    expect(isDefinitionMatchMastered(score)).toBe(true);

    const messy = { ...perfect, [doc.pairs[0]!.id]: doc.pairs[1]!.id };
    expect(isDefinitionMatchMastered(scoreDefinitionMatchAnswers(doc.pairs, messy))).toBe(
      false,
    );
  });

  it("compiles from a vocab list with definitions", () => {
    const list = createHobbiesVocabularyListDocument();
    const doc = compileDefinitionMatchFromVocabList({ list, maxPairs: 6 });
    expect(doc.pairs.length).toBeGreaterThanOrEqual(4);
    expect(doc.pairs.length).toBeLessThanOrEqual(6);
  });

  it("rejects too few pairs", () => {
    expect(() =>
      validateDefinitionMatchDocument({
        version: 1,
        kind: "definition-match",
        id: "short",
        title: "Short",
        instructions: "Match.",
        shuffleWords: true,
        pairs: [
          { id: "a", word: "a", definition: "Meaning one." },
          { id: "b", word: "b", definition: "Meaning two." },
          { id: "c", word: "c", definition: "Meaning three." },
        ],
      }),
    ).toThrow(/at least 4/);
  });
});
