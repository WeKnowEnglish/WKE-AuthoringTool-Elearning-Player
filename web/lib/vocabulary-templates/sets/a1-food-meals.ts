import type { VocabularySetDefinition } from "../types";
import { foodWord } from "./vocab-set-helpers";
import { FOOD_MEALS_COVER_URL, FOOD_MEALS_MEDIA_URLS } from "./food-media";

const M = FOOD_MEALS_MEDIA_URLS;

export const A1_FOOD_MEALS: VocabularySetDefinition = {
  id: "food_meals",
  title: "Meals",
  learnPhraseTheme: "food_meals",
  coverImageUrl: FOOD_MEALS_COVER_URL,
  words: [
    foodWord(M, "sandwich", "sandwich", {
      clozeA: "I eat a __1__ for lunch.",
      clozeB: "I like my __1__.",
      mealVerb: "eat",
    }),
    foodWord(M, "pizza", "pizza", {
      grammar: "uncountable",
      clozeA: "We eat __1__ for dinner.",
      clozeB: "I like __1__.",
      mealVerb: "eat",
    }),
    foodWord(M, "hamburger", "hamburger", {
      clozeA: "I eat a __1__.",
      clozeB: "This __1__ is big.",
      mealVerb: "eat",
    }),
    foodWord(M, "hotdog", "hot dog", {
      clozeA: "I eat a __1__.",
      clozeB: "I like this __1__.",
      mealVerb: "eat",
    }),
    foodWord(M, "taco", "taco", { clozeA: "I eat a __1__.", clozeB: "This __1__ is tasty.", mealVerb: "eat" }),
    foodWord(M, "spaghetti", "spaghetti", {
      grammar: "uncountable",
      clozeA: "We eat __1__ for dinner.",
      clozeB: "I like __1__.",
      mealVerb: "eat",
    }),
    foodWord(M, "salad", "salad", {
      grammar: "uncountable",
      clozeA: "I eat __1__ for lunch.",
      clozeB: "This __1__ is fresh.",
      mealVerb: "eat",
    }),
    foodWord(M, "soup", "soup", {
      grammar: "uncountable",
      clozeA: "I eat __1__ for lunch.",
      clozeB: "The __1__ is hot.",
      mealVerb: "eat",
    }),
    foodWord(M, "rice", "rice", {
      grammar: "uncountable",
      clozeA: "We eat __1__ for lunch.",
      clozeB: "I like __1__.",
      mealVerb: "eat",
    }),
    foodWord(M, "meat", "meat", {
      grammar: "uncountable",
      clozeA: "We eat __1__ for dinner.",
      clozeB: "This __1__ is hot.",
      mealVerb: "eat",
    }),
    foodWord(M, "cheese", "cheese", {
      grammar: "uncountable",
      clozeA: "I like __1__ on my sandwich.",
      clozeB: "This __1__ is yellow.",
      mealVerb: "eat",
    }),
    foodWord(M, "potato", "potato", {
      clozeA: "I eat a __1__.",
      clozeB: "This __1__ is big.",
      mealVerb: "eat",
    }),
    foodWord(M, "french_fries", "french fries", {
      grammar: "plural",
      clozeA: "I eat __1__ with my lunch.",
      clozeB: "These __1__ are salty.",
      mealVerb: "eat",
    }),
    foodWord(M, "noodles", "noodles", {
      grammar: "plural",
      clozeA: "I eat __1__ for lunch.",
      clozeB: "These __1__ are hot.",
      mealVerb: "eat",
    }),
    foodWord(M, "carrot", "carrot", {
      clozeA: "I eat a __1__.",
      clozeB: "This __1__ is orange.",
      mealVerb: "eat",
    }),
  ],
  falseClaims: {
    sandwich: ["This is a pizza.", "This is a hamburger."],
    pizza: ["This is a sandwich.", "This is spaghetti."],
    hamburger: ["This is a hot dog.", "This is a sandwich."],
    hotdog: ["This is a hamburger.", "This is a taco."],
    taco: ["This is a hot dog.", "This is a sandwich."],
    spaghetti: ["This is soup.", "This is noodles."],
    salad: ["This is soup.", "This is rice."],
    soup: ["This is salad.", "This is spaghetti."],
    rice: ["This is noodles.", "This is soup."],
    meat: ["This is cheese.", "This is a potato."],
    cheese: ["This is meat.", "This is bread."],
    potato: ["This is a carrot.", "This is meat."],
    french_fries: ["These are noodles.", "This is a potato."],
    noodles: ["This is rice.", "This is spaghetti."],
    carrot: ["This is a potato.", "This is an apple."],
  },
  learnExcludeWordIds: ["french_fries", "hotdog", "taco"],
};
