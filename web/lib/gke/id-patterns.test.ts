import { describe, expect, it } from "vitest";
import {
  DOMAIN_ENTRY_SENTINEL,
  isGrammarConceptId,
  isGrammarL1Id,
  isGrammarL2Id,
  isGrammarL4Id,
  isGrammarMicroSkillId,
  isValidL4ChildId,
  parseErrorCode,
} from "./id-patterns";

describe("grammar ID patterns", () => {
  it("accepts L1–L4 IDs from ID-NAMING v0.1", () => {
    expect(isGrammarL1Id("grammar.existential")).toBe(true);
    expect(isGrammarL2Id("grammar.existential.there_is_are")).toBe(true);
    expect(isGrammarConceptId("grammar.existential.there_is_are.affirmative")).toBe(true);
    expect(
      isGrammarMicroSkillId(
        "grammar.existential.there_is_are.affirmative.singular_countable",
      ),
    ).toBe(true);
  });

  it("rejects invalid grammar IDs", () => {
    expect(isGrammarL4Id("grammar.existential.there_is_are.affirmative")).toBe(false);
    expect(isGrammarConceptId("grammar.existential.there_is_are")).toBe(false);
    expect(isGrammarL1Id("grammar.Existential")).toBe(false);
    expect(isGrammarL1Id("error.agreement.there_are_singular")).toBe(false);
  });

  it("validates L4 child suffix", () => {
    const l3 = "grammar.existential.there_is_are.affirmative";
    expect(
      isValidL4ChildId("grammar.existential.there_is_are.affirmative.singular_countable", l3),
    ).toBe(true);
    expect(
      isValidL4ChildId("grammar.existential.there_is_are.affirmative.extra.nested", l3),
    ).toBe(false);
  });
});

describe("error code patterns", () => {
  it("parses error codes", () => {
    expect(parseErrorCode("error.agreement.there_are_singular")).toEqual({
      family: "agreement",
      specific: "there_are_singular",
    });
    expect(parseErrorCode("not-an-error")).toBeNull();
  });
});

describe("domain_entry sentinel", () => {
  it("is a fixed string", () => {
    expect(DOMAIN_ENTRY_SENTINEL).toBe("domain_entry");
  });
});
