import type { VocabularySetDefinition } from "../types";
import { FARM_ANIMALS_COVER_URL, FARM_ANIMALS_MEDIA_URLS } from "./animals-media";
import { animalWord } from "./vocab-set-helpers";

const M = FARM_ANIMALS_MEDIA_URLS;
const F = "I see a __1__ on the farm.";
const H = "The farmer has a __1__.";
const L = "A __1__ lives on the farm.";

export const A1_FARM_ANIMALS: VocabularySetDefinition = {
  id: "farm_animals",
  title: "Farm Animals",
  coverImageUrl: FARM_ANIMALS_COVER_URL,
  words: [
    animalWord(M, "pig", "pig", F, H, { placeholderHex: "fda4af", placeholderInk: "9f1239" }),
    animalWord(M, "cow", "cow", F, "The __1__ says moo.", { placeholderHex: "e7e5e4", placeholderInk: "44403c" }),
    animalWord(M, "sheep", "sheep", F, L, { placeholderHex: "f5f5f4", placeholderInk: "57534e" }),
    animalWord(M, "goat", "goat", F, H, { placeholderHex: "d6d3d1", placeholderInk: "44403c" }),
    animalWord(M, "chicken", "chicken", F, L, { placeholderHex: "fde68a", placeholderInk: "92400e" }),
    animalWord(M, "duck", "duck", F, H, { placeholderHex: "fde047", placeholderInk: "854d0e" }),
    animalWord(M, "horse", "horse", F, L, { placeholderHex: "d97706", placeholderInk: "fffbeb" }),
    animalWord(M, "donkey", "donkey", F, H, { placeholderHex: "a8a29e", placeholderInk: "292524" }),
    animalWord(M, "rooster", "rooster", F, L, { placeholderHex: "f87171", placeholderInk: "7f1d1d" }),
    animalWord(M, "chick", "chick", F, "Look at the little __1__!", { placeholderHex: "fef08a", placeholderInk: "a16207" }),
    animalWord(M, "buffalo", "buffalo", F, L, { placeholderHex: "78716c", placeholderInk: "fafaf9" }),
    animalWord(M, "bull", "bull", F, H, { placeholderHex: "991b1b", placeholderInk: "fef2f2" }),
    animalWord(M, "lamb", "lamb", F, L, { placeholderHex: "fafaf9", placeholderInk: "57534e" }),
    animalWord(M, "goose", "goose", F, H, { placeholderHex: "e5e7eb", placeholderInk: "1f2937" }),
    animalWord(M, "turkey", "turkey", F, L, { placeholderHex: "c2410c", placeholderInk: "fff7ed" }),
  ],
  falseClaims: {
    pig: ["This is a cow.", "This is a goat."],
    cow: ["This is a horse.", "This is a bull."],
    sheep: ["This is a goat.", "This is a lamb."],
    goat: ["This is a sheep.", "This is a pig."],
    chicken: ["This is a duck.", "This is a rooster."],
    duck: ["This is a goose.", "This is a chicken."],
    horse: ["This is a cow.", "This is a donkey."],
    donkey: ["This is a horse.", "This is a cow."],
    rooster: ["This is a chicken.", "This is a duck."],
    chick: ["This is a chicken.", "This is a duck."],
    buffalo: ["This is a cow.", "This is a bull."],
    bull: ["This is a cow.", "This is a buffalo."],
    lamb: ["This is a sheep.", "This is a goat."],
    goose: ["This is a duck.", "This is a chicken."],
    turkey: ["This is a chicken.", "This is a goose."],
  },
  learnExcludeWordIds: ["buffalo", "donkey", "turkey"],
};
