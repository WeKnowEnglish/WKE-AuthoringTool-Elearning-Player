import type { VocabularySetDefinition } from "../types";
import { WILD_ANIMALS_COVER_URL, WILD_ANIMALS_MEDIA_URLS } from "./animals-media";
import { animalWord } from "./vocab-set-helpers";

const M = WILD_ANIMALS_MEDIA_URLS;
const Z = "I see a __1__ at the zoo.";
const W = "The __1__ is wild.";
const L = "Look at the __1__!";

export const A1_WILD_ANIMALS: VocabularySetDefinition = {
  id: "wild_animals",
  title: "Wild Animals",
  coverImageUrl: WILD_ANIMALS_COVER_URL,
  words: [
    animalWord(M, "lion", "lion", Z, "A __1__ can run fast.", { placeholderHex: "fde68a", placeholderInk: "78350f" }),
    animalWord(M, "tiger", "tiger", Z, W, { placeholderHex: "fed7aa", placeholderInk: "9a3412" }),
    animalWord(M, "zebra", "zebra", Z, L, { placeholderHex: "e5e7eb", placeholderInk: "1f2937" }),
    animalWord(M, "monkey", "monkey", Z, "The __1__ lives in the jungle.", { placeholderHex: "d6d3d1", placeholderInk: "44403c" }),
    animalWord(M, "bear", "bear", Z, W, { placeholderHex: "a8a29e", placeholderInk: "292524" }),
    animalWord(M, "wolf", "wolf", Z, "A __1__ can run fast.", { placeholderHex: "9ca3af", placeholderInk: "1f2937" }),
    animalWord(M, "elephant", "elephant", Z, L, { placeholderHex: "9ca3af", placeholderInk: "374151" }),
    animalWord(M, "giraffe", "giraffe", Z, "Look at the tall __1__!", { placeholderHex: "fde047", placeholderInk: "713f12" }),
    animalWord(M, "panda", "panda", Z, W, { placeholderHex: "f5f5f4", placeholderInk: "171717" }),
    animalWord(M, "camel", "camel", Z, L, { placeholderHex: "fcd34d", placeholderInk: "92400e" }),
    animalWord(M, "deer", "deer", Z, W, { placeholderHex: "d97706", placeholderInk: "fffbeb" }),
    animalWord(M, "parrot", "parrot", "The __1__ lives in the jungle.", L, { placeholderHex: "4ade80", placeholderInk: "14532d" }),
    animalWord(M, "cheetah", "cheetah", Z, "A __1__ can run fast.", { placeholderHex: "fbbf24", placeholderInk: "78350f" }),
    animalWord(M, "rhino", "rhino", Z, W, { placeholderHex: "a8a29e", placeholderInk: "44403c" }),
    animalWord(M, "hippo", "hippo", Z, L, { placeholderHex: "94a3b8", placeholderInk: "1e3a5f" }),
  ],
  falseClaims: {
    lion: ["This is a tiger.", "This is a bear."],
    tiger: ["This is a lion.", "This is a zebra."],
    zebra: ["This is a tiger.", "This is a giraffe."],
    monkey: ["This is a parrot.", "This is a bear."],
    bear: ["This is a wolf.", "This is a lion."],
    wolf: ["This is a bear.", "This is a deer."],
    elephant: ["This is a giraffe.", "This is a rhino."],
    giraffe: ["This is an elephant.", "This is a zebra."],
    panda: ["This is a bear.", "This is a deer."],
    camel: ["This is a zebra.", "This is an elephant."],
    deer: ["This is a wolf.", "This is a bear."],
    parrot: ["This is a monkey.", "This is a tiger."],
    cheetah: ["This is a tiger.", "This is a lion."],
    rhino: ["This is a hippo.", "This is an elephant."],
    hippo: ["This is a rhino.", "This is an elephant."],
  },
  learnExcludeWordIds: ["cheetah", "rhino", "hippo"],
};
