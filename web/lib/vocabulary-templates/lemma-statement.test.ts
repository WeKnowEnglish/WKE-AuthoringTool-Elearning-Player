import { describe, expect, it } from "vitest";
import {
  hasBrokenThisIsPattern,
  hasEatLiquidBreakfastPattern,
  iLikeLemmaStatement,
  inferLemmaGrammar,
  lemmaForILike,
  mealBreakfastStatement,
  pickStickerMatchPhraseVariant,
  resolveMealVerb,
  stickerMatchLemmaStatement,
  thisLemmaStatement,
} from "./lemma-statement";
import type { VocabWord } from "./types";

function word(
  id: string,
  lemma: string,
  opts?: { grammar?: VocabWord["grammar"]; mealVerb?: VocabWord["mealVerb"] },
): Pick<VocabWord, "id" | "lemma" | "grammar" | "mealVerb"> {
  return { id, lemma, grammar: opts?.grammar, mealVerb: opts?.mealVerb };
}

describe("inferLemmaGrammar", () => {
  it("classifies breakfast lemmas", () => {
    expect(inferLemmaGrammar("milk")).toBe("uncountable");
    expect(inferLemmaGrammar("eggs")).toBe("plural");
    expect(inferLemmaGrammar("apple")).toBe("count");
    expect(inferLemmaGrammar("water")).toBe("uncountable");
  });
});

describe("resolveMealVerb", () => {
  it("uses explicit mealVerb when set", () => {
    expect(resolveMealVerb(word("jam", "jam", { mealVerb: "none" }))).toBe("none");
    expect(resolveMealVerb(word("milk", "milk", { mealVerb: "drink" }))).toBe("drink");
  });

  it("infers drink for liquids and none for jam", () => {
    expect(resolveMealVerb(word("milk", "milk"))).toBe("drink");
    expect(resolveMealVerb(word("water", "water"))).toBe("drink");
    expect(resolveMealVerb(word("coffee", "coffee"))).toBe("drink");
    expect(resolveMealVerb(word("tea", "tea"))).toBe("drink");
    expect(resolveMealVerb(word("jam", "jam"))).toBe("none");
    expect(resolveMealVerb(word("apple", "apple"))).toBe("eat");
  });
});

describe("mealBreakfastStatement", () => {
  it("uses drink for liquids and eat for solids", () => {
    expect(mealBreakfastStatement(word("milk", "milk"))).toBe(
      "We drink milk for breakfast.",
    );
    expect(mealBreakfastStatement(word("apple", "apple", { grammar: "count" }))).toBe(
      "We eat apples for breakfast.",
    );
    expect(mealBreakfastStatement(word("jam", "jam", { mealVerb: "none" }))).toBeNull();
  });
});

describe("hasEatLiquidBreakfastPattern", () => {
  it("flags ungrammatical liquid eat lines", () => {
    expect(hasEatLiquidBreakfastPattern("We eat milk for breakfast.")).toBe(true);
    expect(hasEatLiquidBreakfastPattern("We eat water for breakfast.")).toBe(true);
    expect(hasEatLiquidBreakfastPattern("We drink milk for breakfast.")).toBe(false);
    expect(hasEatLiquidBreakfastPattern("We eat apples for breakfast.")).toBe(false);
  });
});

describe("thisLemmaStatement", () => {
  it("uses bare noun for uncountable", () => {
    expect(thisLemmaStatement(word("milk", "milk", { grammar: "uncountable" }))).toBe(
      "This is milk.",
    );
    expect(thisLemmaStatement(word("bread", "bread"))).toBe("This is bread.");
  });

  it("uses These are for plural", () => {
    expect(thisLemmaStatement(word("eggs", "eggs", { grammar: "plural" }))).toBe(
      "These are eggs.",
    );
    expect(thisLemmaStatement(word("pancakes", "pancakes"))).toBe("These are pancakes.");
  });

  it("uses a/an for singular count", () => {
    expect(thisLemmaStatement(word("apple", "apple", { grammar: "count" }))).toBe(
      "This is an apple.",
    );
    expect(thisLemmaStatement(word("banana", "banana"))).toBe("This is a banana.");
    expect(thisLemmaStatement(word("orange", "orange"))).toBe("This is an orange.");
  });

  it("never produces broken This is an eggs pattern", () => {
    const samples = ["eggs", "pancakes", "noodles", "milk", "apple", "bread"];
    for (const lemma of samples) {
      const s = thisLemmaStatement(word(lemma, lemma));
      expect(hasBrokenThisIsPattern(s), s).toBe(false);
    }
  });
});

describe("iLikeLemmaStatement", () => {
  it("uses bare noun for uncountable", () => {
    expect(lemmaForILike(word("milk", "milk", { grammar: "uncountable" }))).toBe("milk");
    expect(iLikeLemmaStatement(word("bread", "bread"))).toBe("I like bread.");
  });

  it("uses plural lemma as-is", () => {
    expect(iLikeLemmaStatement(word("eggs", "eggs", { grammar: "plural" }))).toBe(
      "I like eggs.",
    );
    expect(iLikeLemmaStatement(word("pancakes", "pancakes"))).toBe("I like pancakes.");
  });

  it("pluralizes count nouns", () => {
    expect(iLikeLemmaStatement(word("apple", "apple", { grammar: "count" }))).toBe(
      "I like apples.",
    );
    expect(iLikeLemmaStatement(word("banana", "banana"))).toBe("I like bananas.");
    expect(iLikeLemmaStatement(word("orange", "orange"))).toBe("I like oranges.");
  });
});

describe("stickerMatchLemmaStatement", () => {
  const apple = word("apple", "apple", { grammar: "count" });

  it("builds all four phrase templates", () => {
    expect(stickerMatchLemmaStatement(apple, "i_like")).toBe("I like apples.");
    expect(stickerMatchLemmaStatement(apple, "i_dont_like")).toBe("I don't like apples.");
    expect(stickerMatchLemmaStatement(apple, "mom_doesnt_like")).toBe(
      "My mom doesn't like apples.",
    );
    expect(stickerMatchLemmaStatement(apple, "we_eat_breakfast")).toBe(
      "We eat apples for breakfast.",
    );
  });

  it("uses drink for liquids at breakfast", () => {
    expect(stickerMatchLemmaStatement(word("milk", "milk"), "we_eat_breakfast")).toBe(
      "We drink milk for breakfast.",
    );
    expect(stickerMatchLemmaStatement(word("tea", "tea"), "we_eat_breakfast")).toBe(
      "We drink tea for breakfast.",
    );
  });

  it("uses uncountable and plural nouns consistently", () => {
    expect(stickerMatchLemmaStatement(word("eggs", "eggs", { grammar: "plural" }), "i_dont_like")).toBe(
      "I don't like eggs.",
    );
  });
});

describe("pickStickerMatchPhraseVariant", () => {
  it("is stable for the same word and session seed", () => {
    const w = word("apple", "apple");
    const a = pickStickerMatchPhraseVariant(w, "session-1");
    const b = pickStickerMatchPhraseVariant(w, "session-1");
    expect(a).toBe(b);
  });

  it("never picks we_eat_breakfast for jam", () => {
    const jam = word("jam", "jam", { mealVerb: "none" });
    for (let i = 0; i < 40; i++) {
      const variant = pickStickerMatchPhraseVariant(jam, `jam-seed-${i}`);
      expect(variant).not.toBe("we_eat_breakfast");
    }
  });

  it("can differ across words in the same session", () => {
    const variants = new Set(
      ["apple", "banana", "bread", "eggs", "milk", "orange"].map((id) =>
        pickStickerMatchPhraseVariant(word(id, id), "session-mix"),
      ),
    );
    expect(variants.size).toBeGreaterThan(1);
  });
});
