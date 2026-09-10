import { describe, expect, it } from "vitest";
import {
  asDefinitionMatchDraft,
  cloneDefinitionMatchDocumentForAuthoring,
  compileDefinitionMatchFromVocabList,
  createBlankDefinitionMatchDocument,
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

  it("does not treat a blank starter as assignable", () => {
    const blank = createBlankDefinitionMatchDocument();
    expect(blank.pairs).toHaveLength(4);
    expect(blank.title).not.toBe("Hobbies · Definition match");
    expect(blank.pairs.every((pair) => pair.word === "" && pair.definition === "")).toBe(
      true,
    );
    expect(() => validateDefinitionMatchDocument(blank)).toThrow();
  });

  it("keeps incomplete drafts editable and remaps sample ids on clone", () => {
    const fromEmpty = asDefinitionMatchDraft({});
    expect(fromEmpty.pairs).toHaveLength(4);
    expect(fromEmpty.pairs[0]!.word).toBe("");
    expect(asDefinitionMatchDraft({}).pairs[0]!.id).toBe(fromEmpty.pairs[0]!.id);

    const incomplete = asDefinitionMatchDraft({
      version: 1,
      kind: "definition-match",
      id: "draft",
      title: "My words",
      instructions: "Match.",
      shuffleWords: true,
      pairs: [
        { id: "p1", word: "paint", definition: "" },
        { id: "p2", word: "", definition: "To move your body to music." },
      ],
    });
    expect(incomplete.pairs).toHaveLength(4);
    expect(incomplete.pairs[0]).toMatchObject({ id: "p1", word: "paint", definition: "" });
    expect(incomplete.pairs[1]).toMatchObject({
      id: "p2",
      word: "",
      definition: "To move your body to music.",
    });
    expect(() => validateDefinitionMatchDocument(incomplete)).toThrow();

    const sample = createSampleDefinitionMatchDocument();
    const clone = cloneDefinitionMatchDocumentForAuthoring(sample);
    expect(clone.id).not.toBe(sample.id);
    expect(clone.pairs[0]!.id).not.toBe(sample.pairs[0]!.id);
    expect(clone.pairs[0]!.word).toBe(sample.pairs[0]!.word);
    expect(validateDefinitionMatchDocument(clone).title).toBe(sample.title);
  });

  it("rejects a definition that contains the answer word", () => {
    const sample = createSampleDefinitionMatchDocument();
    expect(() =>
      validateDefinitionMatchDocument({
        ...sample,
        pairs: sample.pairs.map((pair, index) =>
          index === 0
            ? { ...pair, definition: `People paint pictures with a brush.` }
            : pair,
        ),
      }),
    ).toThrow(/should not contain the answer word/i);
  });
});
