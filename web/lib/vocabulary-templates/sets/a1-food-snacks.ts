import type { VocabularySetDefinition } from "../types";
import { foodWord } from "./vocab-set-helpers";
import { FOOD_SNACKS_COVER_URL, FOOD_SNACKS_MEDIA_URLS } from "./food-media";

const M = FOOD_SNACKS_MEDIA_URLS;

export const A1_FOOD_SNACKS: VocabularySetDefinition = {
  id: "food_snacks",
  title: "Snacks & Treats",
  learnPhraseTheme: "food_snacks",
  coverImageUrl: FOOD_SNACKS_COVER_URL,
  words: [
    foodWord(M, "popcorn", "popcorn", {
      grammar: "uncountable",
      clozeA: "I eat __1__ at the movies.",
      clozeB: "I like __1__.",
      mealVerb: "eat",
    }),
    foodWord(M, "chips", "chips", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: "These __1__ are salty.",
      mealVerb: "eat",
    }),
    foodWord(M, "nuts", "nuts", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: "These __1__ are crunchy.",
      mealVerb: "eat",
    }),
    foodWord(M, "chocolate_bar", "chocolate bar", {
      clozeA: "I eat a __1__.",
      clozeB: "This __1__ is sweet.",
      mealVerb: "eat",
    }),
    foodWord(M, "cookies", "cookies", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: "These __1__ are sweet.",
      mealVerb: "eat",
    }),
    foodWord(M, "cake", "cake", {
      clozeA: "I eat a piece of __1__.",
      clozeB: "This __1__ is sweet.",
      mealVerb: "eat",
    }),
    foodWord(M, "ice_cream", "ice cream", {
      grammar: "uncountable",
      clozeA: "I eat __1__ on a hot day.",
      clozeB: "I like __1__.",
      mealVerb: "eat",
    }),
    foodWord(M, "donut", "donut", {
      clozeA: "I eat a __1__.",
      clozeB: "This __1__ is sweet.",
      mealVerb: "eat",
    }),
    foodWord(M, "cupcake", "cupcake", {
      clozeA: "I eat a __1__.",
      clozeB: "This __1__ is small.",
      mealVerb: "eat",
    }),
    foodWord(M, "honey", "honey", {
      grammar: "uncountable",
      mealVerb: "none",
      clozeA: "This __1__ is sweet.",
      clozeB: "I like __1__ on my toast.",
    }),
    foodWord(M, "pretzels", "pretzels", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: "These __1__ are salty.",
      placeholderHex: "fde68a",
      placeholderInk: "92400e",
      mealVerb: "eat",
    }),
    foodWord(M, "candy", "candy", {
      grammar: "uncountable",
      clozeA: "I eat some __1__.",
      clozeB: "This __1__ is sweet.",
      placeholderHex: "fbcfe8",
      placeholderInk: "9d174d",
      mealVerb: "eat",
    }),
    foodWord(M, "crackers", "crackers", {
      grammar: "plural",
      clozeA: "I eat some __1__.",
      clozeB: "These __1__ are crunchy.",
      placeholderHex: "fef3c7",
      placeholderInk: "a16207",
      mealVerb: "eat",
    }),
    foodWord(M, "lollipop", "lollipop", {
      clozeA: "I eat a __1__.",
      clozeB: "This __1__ is sweet.",
      placeholderHex: "fecdd3",
      placeholderInk: "be123c",
      mealVerb: "eat",
    }),
    foodWord(M, "jelly", "jelly", {
      grammar: "uncountable",
      mealVerb: "none",
      clozeA: "This __1__ is sweet.",
      clozeB: "I like __1__ on my bread.",
      placeholderHex: "ddd6fe",
      placeholderInk: "6d28d9",
    }),
  ],
  falseClaims: {
    popcorn: ["These are chips.", "This is candy."],
    chips: ["These are nuts.", "These are crackers."],
    nuts: ["These are chips.", "These are popcorn."],
    chocolate_bar: ["This is a cookie.", "This is candy."],
    cookies: ["This is a cake.", "This is a cupcake."],
    cake: ["This is a cupcake.", "This is a donut."],
    ice_cream: ["This is a cake.", "This is honey."],
    donut: ["This is a cupcake.", "This is a cookie."],
    cupcake: ["This is a donut.", "This is a cake."],
    honey: ["This is jam.", "This is jelly."],
    pretzels: ["These are chips.", "These are crackers."],
    candy: ["This is a lollipop.", "This is honey."],
    crackers: ["These are chips.", "These are pretzels."],
    lollipop: ["This is candy.", "This is a cupcake."],
    jelly: ["This is jam.", "This is honey."],
  },
  learnExcludeWordIds: ["pretzels", "candy", "crackers"],
};
