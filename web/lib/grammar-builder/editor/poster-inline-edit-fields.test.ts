import { describe, expect, it } from "vitest";
import countableJson from "@/content/grammar/countable-nouns-a1.json";
import shortAnswersJson from "@/content/grammar/short-answers-there-is-a1.json";
import uncountableJson from "@/content/grammar/uncountable-nouns-a1.json";
import { parseGrammarModule } from "../validate-module";
import { commitPosterInlineEditValue, readPosterInlineEditValue } from "./poster-inline-edit-commit";
import {
  parsePosterInlineEditFieldKey,
  posterExampleFieldKey,
  posterInlineEditFieldKey,
} from "./poster-inline-edit-fields";

describe("poster-inline-edit-fields", () => {
  it("round-trips chrome field keys", () => {
    const key = posterInlineEditFieldKey(3, {
      kind: "chrome",
      field: "glanceRuleHighlight",
    });
    expect(parsePosterInlineEditFieldKey(key)).toEqual({
      cardId: 3,
      target: { kind: "chrome", field: "glanceRuleHighlight" },
    });
  });

  it("round-trips column item keys", () => {
    const key = posterExampleFieldKey(2, "leftColumn", 1, "text");
    expect(key).toBe("card:2:leftColumn:items:1:text");
    expect(parsePosterInlineEditFieldKey(key)).toEqual({
      cardId: 2,
      target: { kind: "columnItem", side: "leftColumn", index: 1, prop: "text" },
    });
  });

  it("round-trips phase C field keys", () => {
    expect(parsePosterInlineEditFieldKey("card:1:goodBad:good:text")).toEqual({
      cardId: 1,
      target: { kind: "goodBad", side: "good", prop: "text" },
    });
    expect(parsePosterInlineEditFieldKey("card:3:banner:highlight")).toEqual({
      cardId: 3,
      target: { kind: "banner", field: "highlight" },
    });
    expect(parsePosterInlineEditFieldKey("card:2:positiveSide:example")).toEqual({
      cardId: 2,
      target: { kind: "sidePanel", panel: "positiveSide", field: "example" },
    });
    expect(parsePosterInlineEditFieldKey("card:3:summary:rows:1:cells:2:mark")).toEqual({
      cardId: 3,
      target: { kind: "summaryCell", rowIndex: 1, colIndex: 2, prop: "mark" },
    });
    expect(parsePosterInlineEditFieldKey("card:1:items:0:transform:ipa")).toEqual({
      cardId: 1,
      target: { kind: "transformation", itemIndex: 0, field: "ipa" },
    });
    expect(parsePosterInlineEditFieldKey("card:4:subHeader:label")).toEqual({
      cardId: 4,
      target: { kind: "subHeader", field: "label" },
    });
    expect(parsePosterInlineEditFieldKey("card:2:patterns:1:formula")).toEqual({
      cardId: 2,
      target: { kind: "pattern", index: 1, prop: "formula" },
    });
  });

  it("supports legacy chrome keys", () => {
    expect(parsePosterInlineEditFieldKey("card:4:kidTitle")).toEqual({
      cardId: 4,
      target: { kind: "chrome", field: "kidTitle" },
    });
  });
});

describe("poster-inline-edit-commit", () => {
  const draft = parseGrammarModule(countableJson, { posterContentRules: false });

  it("reads and commits card item text", () => {
    const target = { kind: "cardItem" as const, index: 0, prop: "text" as const };
    const before = readPosterInlineEditValue(draft, 1, target);
    expect(before.length).toBeGreaterThan(0);

    const next = commitPosterInlineEditValue(draft, 1, target, "How many apples?");
    expect(readPosterInlineEditValue(next, 1, target)).toBe("How many apples?");
  });

  it("reads and commits column titles", () => {
    const target = { kind: "columnTitle" as const, side: "leftColumn" as const };
    const next = commitPosterInlineEditValue(draft, 2, target, "COUNTABLE");
    expect(readPosterInlineEditValue(next, 2, target)).toBe("COUNTABLE");
  });

  it("reads and commits good/bad pair text", () => {
    const uncountable = parseGrammarModule(uncountableJson, { posterContentRules: false });
    const target = { kind: "goodBad" as const, side: "good" as const, prop: "text" as const };
    const next = commitPosterInlineEditValue(uncountable, 1, target, "How much water?");
    expect(readPosterInlineEditValue(next, 1, target)).toBe("How much water?");
  });

  it("reads and commits banner highlight", () => {
    const target = { kind: "banner" as const, field: "highlight" as const };
    const before = readPosterInlineEditValue(draft, 3, target);
    expect(before.length).toBeGreaterThan(0);

    const next = commitPosterInlineEditValue(draft, 3, target, "Remember this!");
    expect(readPosterInlineEditValue(next, 3, target)).toBe("Remember this!");
  });

  it("reads and commits summary grid cell mark", () => {
    const shortAnswers = parseGrammarModule(shortAnswersJson, { posterContentRules: false });
    const target = {
      kind: "summaryCell" as const,
      rowIndex: 0,
      colIndex: 0,
      prop: "mark" as const,
    };
    const next = commitPosterInlineEditValue(shortAnswers, 3, target, "check");
    expect(readPosterInlineEditValue(next, 3, target)).toBe("check");
  });
});
