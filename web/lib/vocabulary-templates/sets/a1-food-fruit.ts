import type { VocabularySetDefinition } from "../types";
import { foodWord } from "./vocab-set-helpers";
import { FOOD_FRUIT_COVER_URL, FOOD_FRUIT_MEDIA_URLS } from "./food-media";

const M = FOOD_FRUIT_MEDIA_URLS;
const EAT = "I eat a __1__.";
const LIKE = "I like __1__.";

export const A1_FOOD_FRUIT: VocabularySetDefinition = {
  id: "food_fruit",
  title: "Fruit",
  learnPhraseTheme: "food_fruit",
  coverImageUrl: FOOD_FRUIT_COVER_URL,
  words: [
    foodWord(M, "apple", "apple", { clozeA: EAT, clozeB: "I peel an __1__.", mealVerb: "eat" }),
    foodWord(M, "banana", "banana", { clozeA: EAT, clozeB: "This __1__ is yellow.", mealVerb: "eat" }),
    foodWord(M, "orange", "orange", { clozeA: EAT, clozeB: "The __1__ is juicy.", mealVerb: "eat" }),
    foodWord(M, "grapes", "grapes", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: LIKE,
      mealVerb: "eat",
    }),
    foodWord(M, "strawberry", "strawberry", { clozeA: EAT, clozeB: LIKE, mealVerb: "eat" }),
    foodWord(M, "pear", "pear", { clozeA: EAT, clozeB: LIKE, mealVerb: "eat" }),
    foodWord(M, "cherries", "cherries", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: LIKE,
      placeholderHex: "fecaca",
      placeholderInk: "991b1b",
      mealVerb: "eat",
    }),
    foodWord(M, "lemon", "lemon", {
      clozeA: "This __1__ is sour.",
      clozeB: LIKE,
      placeholderHex: "fef08a",
      placeholderInk: "a16207",
      mealVerb: "eat",
    }),
    foodWord(M, "watermelon", "watermelon", {
      clozeA: "I eat __1__ in summer.",
      clozeB: LIKE,
      placeholderHex: "bbf7d0",
      placeholderInk: "166534",
      mealVerb: "eat",
    }),
    foodWord(M, "mango", "mango", {
      clozeA: EAT,
      clozeB: LIKE,
      placeholderHex: "fde68a",
      placeholderInk: "b45309",
      mealVerb: "eat",
    }),
    foodWord(M, "pineapple", "pineapple", {
      clozeA: EAT,
      clozeB: LIKE,
      placeholderHex: "fef08a",
      placeholderInk: "ca8a04",
      mealVerb: "eat",
    }),
    foodWord(M, "blueberries", "blueberries", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: LIKE,
      placeholderHex: "bfdbfe",
      placeholderInk: "1e40af",
      mealVerb: "eat",
    }),
    foodWord(M, "kiwi", "kiwi", {
      clozeA: EAT,
      clozeB: LIKE,
      placeholderHex: "d9f99d",
      placeholderInk: "3f6212",
      mealVerb: "eat",
    }),
    foodWord(M, "fruit", "fruit", {
      grammar: "uncountable",
      mealVerb: "eat",
      clozeA: "I eat fresh __1__.",
      clozeB: "I like __1__.",
    }),
    foodWord(M, "plum", "plum", {
      clozeA: EAT,
      clozeB: LIKE,
      placeholderHex: "ddd6fe",
      placeholderInk: "6d28d9",
      mealVerb: "eat",
    }),
  ],
  falseClaims: {
    apple: ["This is a banana.", "This is an orange."],
    banana: ["This is an orange.", "This is an apple."],
    orange: ["This is an apple.", "This is a banana."],
    grapes: ["These are cherries.", "These are blueberries."],
    strawberry: ["This is a cherry.", "This is a plum."],
    pear: ["This is an apple.", "This is a plum."],
    cherries: ["These are grapes.", "These are blueberries."],
    lemon: ["This is an orange.", "This is a lime."],
    watermelon: ["This is a mango.", "This is a melon."],
    mango: ["This is a pineapple.", "This is a pear."],
    pineapple: ["This is a mango.", "This is a watermelon."],
    blueberries: ["These are grapes.", "These are cherries."],
    kiwi: ["This is a plum.", "This is a lemon."],
    fruit: ["This is an apple.", "This is a banana."],
    plum: ["This is a pear.", "This is a cherry."],
  },
  learnExcludeWordIds: ["fruit", "blueberries", "kiwi"],
};
