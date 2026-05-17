import { randomWithSeed } from "./shuffle";
import type { VocabLemmaGrammar, VocabMealVerb, VocabWord } from "./types";

/** Mass nouns common in A1 food sets (lemma lowercase). */
const UNCOUNTABLE_LEMMAS = new Set([
  "bread",
  "milk",
  "juice",
  "jam",
  "cereal",
  "rice",
  "water",
  "butter",
  "cheese",
  "sugar",
  "salt",
  "coffee",
  "tea",
  "honey",
  "soup",
]);

/** Default drink-at-breakfast lemmas when `mealVerb` is omitted. */
const DRINK_AT_BREAKFAST_LEMMAS = new Set([
  "milk",
  "juice",
  "water",
  "coffee",
  "tea",
]);

/** Lemmas ending in -s that are singular, not plural. */
const SINGULAR_LEMMAS_ENDING_IN_S = new Set([
  "news",
  "class",
  "glass",
  "bus",
  "gas",
]);

export type VocabWordPhraseInput = Pick<VocabWord, "id" | "lemma" | "grammar" | "mealVerb">;

export function inferLemmaGrammar(lemma: string): VocabLemmaGrammar {
  const lower = lemma.trim().toLowerCase();
  if (!lower) return "count";
  if (UNCOUNTABLE_LEMMAS.has(lower)) return "uncountable";
  if (lower.endsWith("s") && !SINGULAR_LEMMAS_ENDING_IN_S.has(lower)) return "plural";
  return "count";
}

/** Eat vs drink vs no meal line (jam spreads, not a breakfast plate). */
export function resolveMealVerb(word: VocabWordPhraseInput): VocabMealVerb {
  if (word.mealVerb) return word.mealVerb;
  const lower = word.lemma.trim().toLowerCase();
  if (DRINK_AT_BREAKFAST_LEMMAS.has(lower)) return "drink";
  if (lower === "jam") return "none";
  return "eat";
}

function articleFor(lower: string): "a" | "an" {
  return /^[aeiou]/i.test(lower) ? "an" : "a";
}

/** Simple picture-description line: This is / These are + article rules. */
export function thisLemmaStatement(word: Pick<VocabWord, "lemma" | "grammar">): string {
  const lower = word.lemma.trim().toLowerCase();
  const grammar = word.grammar ?? inferLemmaGrammar(lower);

  switch (grammar) {
    case "uncountable":
      return `This is ${lower}.`;
    case "plural":
      return `These are ${lower}.`;
    case "count":
      return `This is ${articleFor(lower)} ${lower}.`;
  }
}

const IRREGULAR_COUNT_PLURALS: Record<string, string> = {
  potato: "potatoes",
  tomato: "tomatoes",
  hero: "heroes",
  echo: "echoes",
};

/** Plural noun for “I like …” (count lemmas only). */
export function pluralizeCountLemma(lemma: string): string {
  const lower = lemma.trim().toLowerCase();
  if (!lower) return lower;
  if (IRREGULAR_COUNT_PLURALS[lower]) return IRREGULAR_COUNT_PLURALS[lower];
  if (lower.endsWith("s")) return lower;
  if (/[^aeiou]y$/i.test(lower)) return `${lower.slice(0, -1)}ies`;
  if (/(?:ch|sh|zz|x|z)$/i.test(lower)) return `${lower}es`;
  return `${lower}s`;
}

/** Noun phrase after “I like” (plural when count). */
export function lemmaForILike(word: Pick<VocabWord, "lemma" | "grammar">): string {
  const lower = word.lemma.trim().toLowerCase();
  const grammar = word.grammar ?? inferLemmaGrammar(lower);

  switch (grammar) {
    case "uncountable":
    case "plural":
      return lower;
    case "count":
      return pluralizeCountLemma(lower);
  }
}

/** “We eat/drink … for breakfast.” — null when mealVerb is none. */
export function mealBreakfastStatement(word: VocabWordPhraseInput): string | null {
  const meal = resolveMealVerb(word);
  if (meal === "none") return null;
  const noun = lemmaForILike(word);
  return meal === "drink" ?
      `We drink ${noun} for breakfast.`
    : `We eat ${noun} for breakfast.`;
}

export const STICKER_MATCH_PHRASE_VARIANTS = [
  "i_like",
  "i_dont_like",
  "mom_doesnt_like",
  "we_eat_breakfast",
] as const;

export type StickerMatchPhraseVariant = (typeof STICKER_MATCH_PHRASE_VARIANTS)[number];

const STICKER_VARIANTS_WITHOUT_MEAL = STICKER_MATCH_PHRASE_VARIANTS.filter(
  (v) => v !== "we_eat_breakfast",
);

/** Seeded phrase template for a sticker match (stable per session + word). */
export function pickStickerMatchPhraseVariant(
  word: VocabWordPhraseInput,
  sessionSeed: string,
): StickerMatchPhraseVariant {
  const pool =
    resolveMealVerb(word) === "none" ?
      STICKER_VARIANTS_WITHOUT_MEAL
    : STICKER_MATCH_PHRASE_VARIANTS;
  const n = pool.length;
  const i = Math.min(
    n - 1,
    Math.floor(randomWithSeed(`${sessionSeed}:sticker-phrase:${word.id}`) * n),
  );
  return pool[i]!;
}

/** Sticker match success line for a chosen template. */
export function stickerMatchLemmaStatement(
  word: VocabWordPhraseInput,
  variant: StickerMatchPhraseVariant,
): string {
  const noun = lemmaForILike(word);
  switch (variant) {
    case "i_like":
      return `I like ${noun}.`;
    case "i_dont_like":
      return `I don't like ${noun}.`;
    case "mom_doesnt_like":
      return `My mom doesn't like ${noun}.`;
    case "we_eat_breakfast": {
      const meal = mealBreakfastStatement(word);
      return meal ?? `I like ${noun}.`;
    }
  }
}

/** Sticker match success line (e.g. “I like apples.”). */
export function iLikeLemmaStatement(word: Pick<VocabWord, "lemma" | "grammar">): string {
  return stickerMatchLemmaStatement({ id: word.lemma, ...word }, "i_like");
}

/** Obvious ungrammatical patterns for tests (e.g. "This is an eggs."). */
export function hasBrokenThisIsPattern(sentence: string): boolean {
  const s = sentence.trim();
  if (/^This is (a|an) \w+s\./i.test(s)) return true;
  if (/^This is (a|an) (milk|bread|rice|juice|jam|cereal)\./i.test(s)) return true;
  if (/^This is (eggs|pancakes|noodles)\./i.test(s)) return true;
  return false;
}

/** Liquids must not use “We eat … for breakfast.” */
export function hasEatLiquidBreakfastPattern(sentence: string): boolean {
  const s = sentence.trim().toLowerCase().replace(/\.$/, "");
  for (const liquid of DRINK_AT_BREAKFAST_LEMMAS) {
    if (s === `we eat ${liquid} for breakfast`) return true;
  }
  return false;
}
