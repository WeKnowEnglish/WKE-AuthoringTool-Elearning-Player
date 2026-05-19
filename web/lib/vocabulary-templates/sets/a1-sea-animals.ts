import type { VocabularySetDefinition } from "../types";
import { SEA_ANIMALS_COVER_URL, SEA_ANIMALS_MEDIA_URLS } from "./animals-media";
import { animalWord } from "./vocab-set-helpers";

const M = SEA_ANIMALS_MEDIA_URLS;
const O = "I see a __1__ in the ocean.";
const S = "The __1__ swims in the sea.";
const W = "A __1__ lives in the water.";
const L = "Look at the __1__!";

export const A1_SEA_ANIMALS: VocabularySetDefinition = {
  id: "sea_animals",
  title: "Sea Animals",
  coverImageUrl: SEA_ANIMALS_COVER_URL,
  words: [
    animalWord(M, "dolphin", "dolphin", O, S, { placeholderHex: "7dd3fc", placeholderInk: "0c4a6e" }),
    animalWord(M, "shark", "shark", O, "The __1__ has fins.", { placeholderHex: "94a3b8", placeholderInk: "1e293b" }),
    animalWord(M, "whale", "whale", O, S, { placeholderHex: "1e3a8a", placeholderInk: "e0f2fe" }),
    animalWord(M, "fish", "fish", O, W, { placeholderHex: "fbbf24", placeholderInk: "1e3a8a" }),
    animalWord(M, "octopus", "octopus", O, L, { placeholderHex: "c084fc", placeholderInk: "581c87" }),
    animalWord(M, "crab", "crab", O, W, { placeholderHex: "f87171", placeholderInk: "7f1d1d" }),
    animalWord(M, "lobster", "lobster", O, L, { placeholderHex: "dc2626", placeholderInk: "fef2f2" }),
    animalWord(M, "seal", "seal", O, S, { placeholderHex: "9ca3af", placeholderInk: "374151" }),
    animalWord(M, "jellyfish", "jellyfish", O, W, { placeholderHex: "e9d5ff", placeholderInk: "6b21a8" }),
    animalWord(M, "seahorse", "seahorse", O, L, { placeholderHex: "fde68a", placeholderInk: "1e40af" }),
    animalWord(M, "starfish", "starfish", O, W, { placeholderHex: "fb923c", placeholderInk: "7c2d12" }),
    animalWord(M, "stingray", "stingray", O, S, { placeholderHex: "64748b", placeholderInk: "f8fafc" }),
    animalWord(M, "otter", "otter", O, L, { placeholderHex: "a8a29e", placeholderInk: "44403c" }),
    animalWord(M, "walrus", "walrus", O, S, { placeholderHex: "94a3b8", placeholderInk: "1e3a5f" }),
    animalWord(M, "seaturtle", "seaturtle", O, W, {
      tts: "sea turtle",
      placeholderHex: "2dd4bf",
      placeholderInk: "134e4a",
    }),
  ],
  falseClaims: {
    dolphin: ["This is a shark.", "This is a whale."],
    shark: ["This is a dolphin.", "This is a whale."],
    whale: ["This is a dolphin.", "This is a shark."],
    fish: ["This is a dolphin.", "This is a seahorse."],
    octopus: ["This is a jellyfish.", "This is a starfish."],
    crab: ["This is a lobster.", "This is a starfish."],
    lobster: ["This is a crab.", "This is an octopus."],
    seal: ["This is a walrus.", "This is a dolphin."],
    jellyfish: ["This is an octopus.", "This is a starfish."],
    seahorse: ["This is a fish.", "This is a starfish."],
    starfish: ["This is a jellyfish.", "This is a crab."],
    stingray: ["This is a shark.", "This is a dolphin."],
    otter: ["This is a seal.", "This is a walrus."],
    walrus: ["This is a seal.", "This is a dolphin."],
    seaturtle: ["This is a fish.", "This is a dolphin."],
  },
  learnExcludeWordIds: ["stingray", "lobster", "walrus"],
};
