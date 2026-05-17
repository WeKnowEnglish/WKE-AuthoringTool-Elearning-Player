import type { VocabularySetDefinition } from "../types";
import { BREAKFAST_FOOD_COVER_URL, BREAKFAST_FOOD_MEDIA_URLS } from "./breakfast-food-media";

const ACCEPT = (lemma: string) => {
  const cap = lemma.charAt(0).toUpperCase() + lemma.slice(1);
  return lemma === cap ? [lemma] : [lemma, cap];
};

const EGGS_ACCEPT = ["eggs", "Eggs", "egg", "Egg"];

function wordImageUrl(id: string, lemma: string): string {
  return (
    (BREAKFAST_FOOD_MEDIA_URLS as Record<string, string | undefined>)[id] ??
    `https://placehold.co/400x400/fef3c7/92400e?text=${encodeURIComponent(lemma)}`
  );
}

/**
 * Hand-authored Breakfast Food vocabulary set (A1).
 * Memory card match: deferred until `memory_match` interaction exists.
 */
export const A1_BREAKFAST_FOOD: VocabularySetDefinition = {
  id: "breakfast_food",
  title: "Breakfast Food",
  coverImageUrl: BREAKFAST_FOOD_COVER_URL,
  words: [
    {
      id: "bread",
      lemma: "bread",
      grammar: "uncountable",
      mealVerb: "eat",
      imageUrl: wordImageUrl("bread", "bread"),
      cloze: [
        { template: "I like __1__ with jam.", acceptable: ACCEPT("bread") },
        { template: "We buy __1__ at the store.", acceptable: ACCEPT("bread") },
      ],
    },
    {
      id: "milk",
      lemma: "milk",
      grammar: "uncountable",
      mealVerb: "drink",
      imageUrl: wordImageUrl("milk", "milk"),
      cloze: [
        { template: "I drink __1__ with my breakfast.", acceptable: ACCEPT("milk") },
        { template: "Please pour the __1__.", acceptable: ACCEPT("milk") },
      ],
    },
    {
      id: "juice",
      lemma: "juice",
      grammar: "uncountable",
      mealVerb: "drink",
      imageUrl: wordImageUrl("juice", "juice"),
      cloze: [
        { template: "I drink some __1__ for breakfast.", acceptable: ACCEPT("juice") },
        { template: "The __1__ is cold.", acceptable: ACCEPT("juice") },
      ],
    },
    {
      id: "water",
      lemma: "water",
      grammar: "uncountable",
      mealVerb: "drink",
      imageUrl: wordImageUrl("water", "water"),
      cloze: [
        { template: "I drink __1__ for breakfast.", acceptable: ACCEPT("water") },
        { template: "Can I have some __1__?", acceptable: ACCEPT("water") },
      ],
    },
    {
      id: "coffee",
      lemma: "coffee",
      grammar: "uncountable",
      mealVerb: "drink",
      imageUrl: wordImageUrl("coffee", "coffee"),
      cloze: [
        { template: "I drink __1__ in the morning.", acceptable: ACCEPT("coffee") },
        { template: "Mom makes __1__ for me.", acceptable: ACCEPT("coffee") },
      ],
    },
    {
      id: "tea",
      lemma: "tea",
      grammar: "uncountable",
      mealVerb: "drink",
      imageUrl: wordImageUrl("tea", "tea"),
      cloze: [
        { template: "I drink __1__ with breakfast.", acceptable: ACCEPT("tea") },
        { template: "Would you like __1__?", acceptable: ACCEPT("tea") },
      ],
    },
    {
      id: "eggs",
      lemma: "eggs",
      grammar: "plural",
      mealVerb: "eat",
      imageUrl: wordImageUrl("eggs", "eggs"),
      cloze: [
        { template: "I eat __1__ for breakfast.", acceptable: EGGS_ACCEPT },
        { template: "She cooks __1__ in a pan.", acceptable: EGGS_ACCEPT },
      ],
    },
    {
      id: "pancakes",
      lemma: "pancakes",
      grammar: "plural",
      mealVerb: "eat",
      imageUrl: wordImageUrl("pancakes", "pancakes"),
      cloze: [
        { template: "We eat __1__ on Sunday.", acceptable: ACCEPT("pancakes") },
        { template: "I love __1__ with syrup.", acceptable: ACCEPT("pancakes") },
      ],
    },
    {
      id: "jam",
      lemma: "jam",
      grammar: "uncountable",
      mealVerb: "none",
      imageUrl: wordImageUrl("jam", "jam"),
      cloze: [
        { template: "I put __1__ on my toast.", acceptable: ACCEPT("jam") },
        { template: "This __1__ is sweet.", acceptable: ACCEPT("jam") },
      ],
    },
    {
      id: "cereal",
      lemma: "cereal",
      grammar: "uncountable",
      mealVerb: "eat",
      imageUrl: wordImageUrl("cereal", "cereal"),
      cloze: [
        { template: "I eat __1__ in a bowl.", acceptable: ACCEPT("cereal") },
        { template: "I pour __1__ into the bowl.", acceptable: ACCEPT("cereal") },
      ],
    },
    {
      id: "rice",
      lemma: "rice",
      grammar: "uncountable",
      mealVerb: "eat",
      imageUrl: wordImageUrl("rice", "rice"),
      cloze: [
        { template: "I like __1__ in the morning.", acceptable: ACCEPT("rice") },
        { template: "We eat __1__ with eggs.", acceptable: ACCEPT("rice") },
      ],
    },
    {
      id: "noodles",
      lemma: "noodles",
      grammar: "plural",
      mealVerb: "eat",
      imageUrl: wordImageUrl("noodles", "noodles"),
      cloze: [
        { template: "I eat __1__ for breakfast.", acceptable: ACCEPT("noodles") },
        { template: "These __1__ are hot.", acceptable: ACCEPT("noodles") },
      ],
    },
    {
      id: "apple",
      lemma: "apple",
      grammar: "count",
      mealVerb: "eat",
      imageUrl: wordImageUrl("apple", "apple"),
      cloze: [
        { template: "I want an __1__.", acceptable: ACCEPT("apple") },
        { template: "She slices an __1__.", acceptable: ACCEPT("apple") },
      ],
    },
    {
      id: "banana",
      lemma: "banana",
      grammar: "count",
      mealVerb: "eat",
      imageUrl: wordImageUrl("banana", "banana"),
      cloze: [
        { template: "I eat a __1__.", acceptable: ACCEPT("banana") },
        { template: "This __1__ is yellow.", acceptable: ACCEPT("banana") },
      ],
    },
    {
      id: "orange",
      lemma: "orange",
      grammar: "count",
      mealVerb: "eat",
      imageUrl: wordImageUrl("orange", "orange"),
      cloze: [
        { template: "I peel an __1__.", acceptable: ACCEPT("orange") },
        { template: "The __1__ is juicy.", acceptable: ACCEPT("orange") },
      ],
    },
  ],
  falseClaims: {
    apple: ["This is a banana.", "This is an orange."],
    milk: ["This is juice.", "This is bread."],
    juice: ["This is milk.", "This is water."],
    water: ["This is juice.", "This is milk."],
    coffee: ["This is tea.", "This is juice."],
    tea: ["This is coffee.", "This is milk."],
    eggs: ["These are pancakes.", "This is cereal."],
    banana: ["This is an orange.", "This is an apple."],
  },
  /** Temporarily keep click-to-reveal at 12 words; water/coffee/tea stay in practice. */
  learnExcludeWordIds: ["water", "coffee", "tea"],
};
