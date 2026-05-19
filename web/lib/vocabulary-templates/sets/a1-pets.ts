import type { VocabularySetDefinition } from "../types";
import { PETS_COVER_URL, PETS_MEDIA_URLS } from "./animals-media";
import { ACCEPT, animalWord } from "./vocab-set-helpers";

const M = PETS_MEDIA_URLS;
const P = "I have a pet __1__.";
const C = "My __1__ is cute.";
const L = "I love my __1__.";

export const A1_PETS: VocabularySetDefinition = {
  id: "pets",
  title: "Pets",
  coverImageUrl: PETS_COVER_URL,
  words: [
    animalWord(M, "cat", "cat", P, C, { placeholderHex: "fbcfe8", placeholderInk: "9d174d" }),
    animalWord(M, "dog", "dog", P, "I play with my __1__.", { placeholderHex: "fde68a", placeholderInk: "92400e" }),
    animalWord(M, "goldfish", "goldfish", P, "Our pet is a __1__.", { placeholderHex: "fde047", placeholderInk: "a16207" }),
    animalWord(M, "rabbit", "rabbit", P, C, { placeholderHex: "e7e5e4", placeholderInk: "57534e" }),
    animalWord(M, "hamster", "hamster", P, L, { placeholderHex: "fcd34d", placeholderInk: "78350f" }),
    animalWord(M, "bird", "bird", P, "Our pet is a __1__.", { placeholderHex: "7dd3fc", placeholderInk: "0c4a6e" }),
    animalWord(M, "turtle", "turtle", P, C, { placeholderHex: "86efac", placeholderInk: "14532d" }),
    animalWord(M, "frog", "frog", P, L, { placeholderHex: "4ade80", placeholderInk: "14532d" }),
    animalWord(M, "snake", "snake", P, C, { placeholderHex: "a3e635", placeholderInk: "365314" }),
    animalWord(M, "lizard", "lizard", P, "I play with my __1__.", { placeholderHex: "bef264", placeholderInk: "3f6212" }),
    animalWord(M, "mouse", "mouse", P, L, { placeholderHex: "d6d3d1", placeholderInk: "44403c" }),
    animalWord(M, "gecko", "gecko", P, C, { placeholderHex: "bef264", placeholderInk: "365314" }),
    {
      id: "guinea_pig",
      lemma: "guineapig",
      grammar: "count",
      mealVerb: "none",
      tts: "guinea pig",
      imageUrl:
        M.guinea_pig ??
        "https://placehold.co/400x400/f9a8d4/be185d?text=guinea%20pig",
      cloze: [
        { template: P, acceptable: ACCEPT("guineapig") },
        { template: "Our pet is a __1__.", acceptable: ACCEPT("guineapig") },
      ],
    },
    animalWord(M, "iguana", "iguana", P, C, { placeholderHex: "6ee7b7", placeholderInk: "065f46" }),
    animalWord(M, "snail", "snail", P, L, { placeholderHex: "d9f99d", placeholderInk: "3f6212" }),
  ],
  falseClaims: {
    cat: ["This is a dog.", "This is a rabbit."],
    dog: ["This is a cat.", "This is a hamster."],
    goldfish: ["This is a turtle.", "This is a frog."],
    rabbit: ["This is a hamster.", "This is a cat."],
    hamster: ["This is a rabbit.", "This is a mouse."],
    bird: ["This is a parrot.", "This is a cat."],
    turtle: ["This is a frog.", "This is a lizard."],
    frog: ["This is a turtle.", "This is a snake."],
    snake: ["This is a lizard.", "This is a frog."],
    lizard: ["This is a snake.", "This is a frog."],
    mouse: ["This is a hamster.", "This is a rabbit."],
    gecko: ["This is a lizard.", "This is a frog."],
    guinea_pig: ["This is a hamster.", "This is a rabbit."],
    iguana: ["This is a lizard.", "This is a snake."],
    snail: ["This is a frog.", "This is a turtle."],
  },
  learnExcludeWordIds: ["iguana", "snail", "guinea_pig"],
};
