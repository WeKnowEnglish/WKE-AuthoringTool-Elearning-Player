import { randomWithSeed } from "./shuffle";
import { inferLemmaGrammar, resolveMealVerb, type VocabWordPhraseInput } from "./lemma-statement";
import type { VocabLearnPhraseTheme } from "./types";

export const STICKER_MATCH_PHRASE_VARIANTS = [
  "i_like",
  "i_dont_like",
  "mom_doesnt_like",
  "we_eat_breakfast",
] as const;

export type StickerMatchPhraseVariant = (typeof STICKER_MATCH_PHRASE_VARIANTS)[number];

export const CLOTHES_WEAR_PHRASE_VARIANTS = [
  "i_am_wearing",
  "they_we_wearing",
  "he_she_wearing",
  "friend_wearing",
  "named_wearing",
] as const;

export type ClothesWearPhraseVariant = (typeof CLOTHES_WEAR_PHRASE_VARIANTS)[number];

export const WEATHER_PHRASE_VARIANTS = ["it_is", "i_see_the", "i_see", "today_is"] as const;

export type WeatherPhraseVariant = (typeof WEATHER_PHRASE_VARIANTS)[number];

export const ANIMALS_PHRASE_VARIANTS = [
  "i_like",
  "i_dont_like",
  "i_see_a",
  "there_is_a",
  "look_at_the",
] as const;

export type AnimalsPhraseVariant = (typeof ANIMALS_PHRASE_VARIANTS)[number];

export const SCHOOL_SUPPLIES_PHRASE_VARIANTS = [
  "i_have_a",
  "i_use_my",
  "this_is_my",
] as const;

export type SchoolSuppliesPhraseVariant = (typeof SCHOOL_SUPPLIES_PHRASE_VARIANTS)[number];

export const SCHOOL_ACTIVITIES_PHRASE_VARIANTS = [
  "i_like_to",
  "we_at_school",
  "i_can",
] as const;

export type SchoolActivitiesPhraseVariant = (typeof SCHOOL_ACTIVITIES_PHRASE_VARIANTS)[number];

export const SCHOOL_PLACES_PHRASE_VARIANTS = [
  "we_are_in",
  "i_see_the",
  "look_at_the",
] as const;

export type SchoolPlacesPhraseVariant = (typeof SCHOOL_PLACES_PHRASE_VARIANTS)[number];

export const BODY_PART_PHRASE_VARIANTS = [
  "this_is_my",
  "i_have_a",
  "touch_your",
] as const;

export type BodyPartPhraseVariant = (typeof BODY_PART_PHRASE_VARIANTS)[number];

export const JOBS_PHRASE_VARIANTS = [
  "he_is_a",
  "she_is_a",
  "i_want_to_be",
] as const;

export type JobsPhraseVariant = (typeof JOBS_PHRASE_VARIANTS)[number];

export const TOYS_PHRASE_VARIANTS = ["i_play_with", "i_have_a"] as const;

export type ToysPhraseVariant = (typeof TOYS_PHRASE_VARIANTS)[number];

export const FOOD_FRUIT_PHRASE_VARIANTS = ["i_like", "i_eat_a", "this_is_a"] as const;

export type FoodFruitPhraseVariant = (typeof FOOD_FRUIT_PHRASE_VARIANTS)[number];

export const FOOD_MEALS_PHRASE_VARIANTS = ["i_like", "i_have_a", "we_eat_lunch"] as const;

export type FoodMealsPhraseVariant = (typeof FOOD_MEALS_PHRASE_VARIANTS)[number];

export const FOOD_SNACKS_PHRASE_VARIANTS = ["i_like", "i_want_some", "i_eat_some"] as const;

export type FoodSnacksPhraseVariant = (typeof FOOD_SNACKS_PHRASE_VARIANTS)[number];

export type LearnPhraseVariant =
  | StickerMatchPhraseVariant
  | ClothesWearPhraseVariant
  | WeatherPhraseVariant
  | AnimalsPhraseVariant
  | SchoolSuppliesPhraseVariant
  | SchoolActivitiesPhraseVariant
  | SchoolPlacesPhraseVariant
  | BodyPartPhraseVariant
  | JobsPhraseVariant
  | ToysPhraseVariant
  | FoodFruitPhraseVariant
  | FoodMealsPhraseVariant
  | FoodSnacksPhraseVariant;

const STICKER_VARIANTS_WITHOUT_MEAL = STICKER_MATCH_PHRASE_VARIANTS.filter(
  (v) => v !== "we_eat_breakfast",
);

const WEAR_NAMES = ["John", "Bill", "Sarah", "Elly"] as const;

const WEATHER_ADJECTIVE_IDS = new Set([
  "sunny",
  "cloudy",
  "rainy",
  "snowy",
  "windy",
  "hot",
  "cold",
  "warm",
]);

const WEATHER_SEE_THE_IDS = new Set(["sun", "cloud", "storm"]);

function articleFor(lower: string): "a" | "an" {
  return /^[aeiou]/i.test(lower) ? "an" : "a";
}

/** Noun phrase after “wear” (article for singular count only). */
export function wearObjectPhrase(word: Pick<VocabWordPhraseInput, "lemma" | "grammar">): string {
  const lower = word.lemma.trim().toLowerCase();
  const grammar = word.grammar ?? inferLemmaGrammar(lower);
  if (grammar === "plural" || grammar === "uncountable") return lower;
  return `${articleFor(lower)} ${lower}`;
}

function pickFromPool<T extends string>(pool: readonly T[], sessionSeed: string, wordId: string): T {
  const n = pool.length;
  const i = Math.min(
    n - 1,
    Math.floor(randomWithSeed(`${sessionSeed}:learn-phrase:${wordId}`) * n),
  );
  return pool[i]!;
}

function weatherPhrasePool(wordId: string): readonly WeatherPhraseVariant[] {
  if (WEATHER_ADJECTIVE_IDS.has(wordId)) return ["it_is", "today_is"];
  if (WEATHER_SEE_THE_IDS.has(wordId)) return ["i_see_the"];
  return ["i_see"];
}

function defaultPhrasePool(word: VocabWordPhraseInput): readonly StickerMatchPhraseVariant[] {
  return resolveMealVerb(word) === "none" ?
      STICKER_VARIANTS_WITHOUT_MEAL
    : STICKER_MATCH_PHRASE_VARIANTS;
}

/** Seeded learn / sticker phrase template (stable per session + word). */
export function pickLearnPhraseVariant(
  word: VocabWordPhraseInput,
  sessionSeed: string,
  theme: VocabLearnPhraseTheme = "default",
): LearnPhraseVariant {
  switch (theme) {
    case "clothes":
      return pickFromPool(CLOTHES_WEAR_PHRASE_VARIANTS, sessionSeed, word.id);
    case "weather":
      return pickFromPool(weatherPhrasePool(word.id), sessionSeed, word.id);
    case "animals":
      return pickFromPool(ANIMALS_PHRASE_VARIANTS, sessionSeed, word.id);
    case "school_supplies":
      return pickFromPool(SCHOOL_SUPPLIES_PHRASE_VARIANTS, sessionSeed, word.id);
    case "school_activities":
      return pickFromPool(SCHOOL_ACTIVITIES_PHRASE_VARIANTS, sessionSeed, word.id);
    case "school_places":
      return pickFromPool(SCHOOL_PLACES_PHRASE_VARIANTS, sessionSeed, word.id);
    case "body_head_face":
    case "body_limbs_inside":
      return pickFromPool(BODY_PART_PHRASE_VARIANTS, sessionSeed, word.id);
    case "jobs_community":
    case "jobs_creative":
      return pickFromPool(JOBS_PHRASE_VARIANTS, sessionSeed, word.id);
    case "toys_everyday":
      return pickFromPool(TOYS_PHRASE_VARIANTS, sessionSeed, word.id);
    case "food_fruit":
      return pickFromPool(FOOD_FRUIT_PHRASE_VARIANTS, sessionSeed, word.id);
    case "food_meals":
      return pickFromPool(FOOD_MEALS_PHRASE_VARIANTS, sessionSeed, word.id);
    case "food_snacks":
      return pickFromPool(FOOD_SNACKS_PHRASE_VARIANTS, sessionSeed, word.id);
    default:
      return pickFromPool(defaultPhrasePool(word), sessionSeed, word.id);
  }
}

function pluralizeForILike(word: Pick<VocabWordPhraseInput, "lemma" | "grammar">): string {
  const lower = word.lemma.trim().toLowerCase();
  const grammar = word.grammar ?? inferLemmaGrammar(lower);
  if (grammar === "uncountable" || grammar === "plural") return lower;
  if (lower.endsWith("s")) return lower;
  if (/[^aeiou]y$/i.test(lower)) return `${lower.slice(0, -1)}ies`;
  if (/(?:ch|sh|zz|x|z)$/i.test(lower)) return `${lower}es`;
  return `${lower}s`;
}

function defaultLearnPhrase(word: VocabWordPhraseInput, variant: StickerMatchPhraseVariant): string {
  const noun = pluralizeForILike(word);
  switch (variant) {
    case "i_like":
      return `I like ${noun}.`;
    case "i_dont_like":
      return `I don't like ${noun}.`;
    case "mom_doesnt_like":
      return `My mom doesn't like ${noun}.`;
    case "we_eat_breakfast": {
      const meal = resolveMealVerb(word);
      if (meal === "none") return `I like ${noun}.`;
      return meal === "drink" ?
          `We drink ${noun} for breakfast.`
        : `We eat ${noun} for breakfast.`;
    }
  }
}

function clothesLearnPhrase(
  word: VocabWordPhraseInput,
  variant: ClothesWearPhraseVariant,
  sessionSeed: string,
): string {
  const item = wearObjectPhrase(word);
  switch (variant) {
    case "i_am_wearing":
      return `I am wearing ${item}.`;
    case "they_we_wearing": {
      const useWe =
        randomWithSeed(`${sessionSeed}:wear-subj:${word.id}`) < 0.5;
      return useWe ? `We are wearing ${item}.` : `They are wearing ${item}.`;
    }
    case "he_she_wearing": {
      const she =
        randomWithSeed(`${sessionSeed}:wear-gender:${word.id}`) < 0.5;
      return she ? `She is wearing ${item}.` : `He is wearing ${item}.`;
    }
    case "friend_wearing":
      return `My friend is wearing ${item}.`;
    case "named_wearing": {
      const idx = Math.min(
        WEAR_NAMES.length - 1,
        Math.floor(randomWithSeed(`${sessionSeed}:wear-name:${word.id}`) * WEAR_NAMES.length),
      );
      return `${WEAR_NAMES[idx]} is wearing ${item}.`;
    }
  }
}

function weatherLearnPhrase(word: VocabWordPhraseInput, variant: WeatherPhraseVariant): string {
  const lower = word.lemma.trim().toLowerCase();
  switch (variant) {
    case "it_is":
      return `It is ${lower}.`;
    case "today_is":
      return `Today is ${lower}.`;
    case "i_see_the":
      return `I see the ${lower}.`;
    case "i_see":
      return `I see ${lower}.`;
  }
}

function schoolSuppliesLearnPhrase(
  word: VocabWordPhraseInput,
  variant: SchoolSuppliesPhraseVariant,
): string {
  const item = wearObjectPhrase(word);
  const lemma = word.lemma.trim();
  switch (variant) {
    case "i_have_a":
      return `I have ${item}.`;
    case "i_use_my":
      return `I use my ${lemma}.`;
    case "this_is_my":
      return `This is my ${lemma}.`;
  }
}

function schoolActivitiesLearnPhrase(
  word: VocabWordPhraseInput,
  variant: SchoolActivitiesPhraseVariant,
): string {
  const lower = word.lemma.trim().toLowerCase();
  switch (variant) {
    case "i_like_to":
      return `I like to ${lower}.`;
    case "we_at_school":
      return `We ${lower} at school.`;
    case "i_can":
      return `I can ${lower}.`;
  }
}

function schoolPlacesLearnPhrase(word: VocabWordPhraseInput, variant: SchoolPlacesPhraseVariant): string {
  const lower = word.lemma.trim().toLowerCase();
  switch (variant) {
    case "we_are_in":
      return `We are in the ${lower}.`;
    case "i_see_the":
      return `I see the ${lower}.`;
    case "look_at_the":
      return `Look at the ${lower}!`;
  }
}

function bodyPartLearnPhrase(word: VocabWordPhraseInput, variant: BodyPartPhraseVariant): string {
  const lemma = word.lemma.trim();
  const lower = lemma.toLowerCase();
  const grammar = word.grammar ?? inferLemmaGrammar(lower);
  const item =
    grammar === "plural" || grammar === "uncountable" ? lower : wearObjectPhrase(word);
  switch (variant) {
    case "this_is_my":
      return grammar === "plural" ? `These are my ${lower}.` : `This is my ${lemma}.`;
    case "i_have_a":
      return grammar === "plural" || grammar === "uncountable" ?
          `I have ${item}.`
        : `I have ${wearObjectPhrase(word)}.`;
    case "touch_your":
      return grammar === "plural" ? `Touch your ${lower}.` : `Touch your ${lemma}.`;
  }
}

function jobsLearnPhrase(word: VocabWordPhraseInput, variant: JobsPhraseVariant): string {
  const item = wearObjectPhrase(word);
  switch (variant) {
    case "he_is_a":
      return `He is ${item}.`;
    case "she_is_a":
      return `She is ${item}.`;
    case "i_want_to_be":
      return `I want to be ${item}.`;
  }
}

function toysLearnPhrase(word: VocabWordPhraseInput, variant: ToysPhraseVariant): string {
  const lower = word.lemma.trim().toLowerCase();
  const grammar = word.grammar ?? inferLemmaGrammar(lower);
  const item =
    grammar === "plural" || grammar === "uncountable" ? lower : wearObjectPhrase(word);
  switch (variant) {
    case "i_play_with":
      return grammar === "plural" || grammar === "uncountable" ?
          `I play with ${item}.`
        : `I play with ${wearObjectPhrase(word)}.`;
    case "i_have_a":
      return grammar === "plural" || grammar === "uncountable" ?
          `I have ${item}.`
        : `I have ${wearObjectPhrase(word)}.`;
  }
}

function foodFruitLearnPhrase(word: VocabWordPhraseInput, variant: FoodFruitPhraseVariant): string {
  const noun = pluralizeForILike(word);
  const withArticle = wearObjectPhrase(word);
  const lemma = word.lemma.trim();
  const grammar = word.grammar ?? inferLemmaGrammar(lemma.toLowerCase());
  switch (variant) {
    case "i_like":
      return `I like ${noun}.`;
    case "i_eat_a":
      return grammar === "plural" || grammar === "uncountable" ?
          `I eat ${noun}.`
        : `I eat ${withArticle}.`;
    case "this_is_a":
      return grammar === "plural" ? `These are ${lemma}.` : `This is ${withArticle}.`;
  }
}

function foodMealsLearnPhrase(word: VocabWordPhraseInput, variant: FoodMealsPhraseVariant): string {
  const noun = pluralizeForILike(word);
  const withArticle = wearObjectPhrase(word);
  const grammar = word.grammar ?? inferLemmaGrammar(word.lemma.trim().toLowerCase());
  switch (variant) {
    case "i_like":
      return `I like ${noun}.`;
    case "i_have_a":
      return grammar === "plural" || grammar === "uncountable" ?
          `I have ${noun}.`
        : `I have ${withArticle}.`;
    case "we_eat_lunch":
      return grammar === "plural" || grammar === "uncountable" ?
          `We eat ${noun} for lunch.`
        : `We eat ${withArticle} for lunch.`;
  }
}

function foodSnacksLearnPhrase(word: VocabWordPhraseInput, variant: FoodSnacksPhraseVariant): string {
  const noun = pluralizeForILike(word);
  const grammar = word.grammar ?? inferLemmaGrammar(word.lemma.trim().toLowerCase());
  switch (variant) {
    case "i_like":
      return `I like ${noun}.`;
    case "i_want_some":
      return `I want some ${noun}.`;
    case "i_eat_some":
      return grammar === "count" ?
          `I eat ${wearObjectPhrase(word)}.`
        : `I eat some ${noun}.`;
  }
}

function animalsLearnPhrase(word: VocabWordPhraseInput, variant: AnimalsPhraseVariant): string {
  const lower = word.lemma.trim().toLowerCase();
  const noun = pluralizeForILike(word);
  const withArticle = wearObjectPhrase(word);
  switch (variant) {
    case "i_like":
      return `I like ${noun}.`;
    case "i_dont_like":
      return `I don't like ${noun}.`;
    case "i_see_a":
      return `I see ${withArticle}.`;
    case "there_is_a":
      return `There is ${withArticle}.`;
    case "look_at_the":
      return `Look at the ${lower}!`;
  }
}

/** Full sentence for learn spotlight or sticker-match TTS. */
export function learnPhraseStatement(
  word: VocabWordPhraseInput,
  variant: LearnPhraseVariant,
  sessionSeed: string,
  theme: VocabLearnPhraseTheme = "default",
): string {
  switch (theme) {
    case "clothes":
      return clothesLearnPhrase(word, variant as ClothesWearPhraseVariant, sessionSeed);
    case "weather":
      return weatherLearnPhrase(word, variant as WeatherPhraseVariant);
    case "animals":
      return animalsLearnPhrase(word, variant as AnimalsPhraseVariant);
    case "school_supplies":
      return schoolSuppliesLearnPhrase(word, variant as SchoolSuppliesPhraseVariant);
    case "school_activities":
      return schoolActivitiesLearnPhrase(word, variant as SchoolActivitiesPhraseVariant);
    case "school_places":
      return schoolPlacesLearnPhrase(word, variant as SchoolPlacesPhraseVariant);
    case "body_head_face":
    case "body_limbs_inside":
      return bodyPartLearnPhrase(word, variant as BodyPartPhraseVariant);
    case "jobs_community":
    case "jobs_creative":
      return jobsLearnPhrase(word, variant as JobsPhraseVariant);
    case "toys_everyday":
      return toysLearnPhrase(word, variant as ToysPhraseVariant);
    case "food_fruit":
      return foodFruitLearnPhrase(word, variant as FoodFruitPhraseVariant);
    case "food_meals":
      return foodMealsLearnPhrase(word, variant as FoodMealsPhraseVariant);
    case "food_snacks":
      return foodSnacksLearnPhrase(word, variant as FoodSnacksPhraseVariant);
    default:
      return defaultLearnPhrase(word, variant as StickerMatchPhraseVariant);
  }
}

/** Spotlight + sticker line using the same seeded variant for this word. */
export function learnSpeechText(
  word: VocabWordPhraseInput,
  sessionSeed: string,
  theme: VocabLearnPhraseTheme = "default",
): string {
  const variant = pickLearnPhraseVariant(word, sessionSeed, theme);
  return learnPhraseStatement(word, variant, sessionSeed, theme);
}

/** @deprecated Use {@link pickLearnPhraseVariant} with theme `"default"`. */
export function pickStickerMatchPhraseVariant(
  word: VocabWordPhraseInput,
  sessionSeed: string,
): StickerMatchPhraseVariant {
  return pickLearnPhraseVariant(word, sessionSeed, "default") as StickerMatchPhraseVariant;
}

/** @deprecated Use {@link learnPhraseStatement} with theme `"default"`. */
export function stickerMatchLemmaStatement(
  word: VocabWordPhraseInput,
  variant: StickerMatchPhraseVariant,
): string {
  return learnPhraseStatement(word, variant, "", "default");
}
