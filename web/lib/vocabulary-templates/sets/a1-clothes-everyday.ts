import type { VocabularySetDefinition } from "../types";
import { clothesWord } from "./vocab-set-helpers";
import { CLOTHES_EVERYDAY_COVER_URL, CLOTHES_EVERYDAY_MEDIA_URLS } from "./clothes-media";

const M = CLOTHES_EVERYDAY_MEDIA_URLS;

export const A1_CLOTHES_EVERYDAY: VocabularySetDefinition = {
  id: "clothes_everyday",
  title: "Everyday Clothes",
  learnPhraseTheme: "clothes",
  coverImageUrl: CLOTHES_EVERYDAY_COVER_URL,
  words: [
    clothesWord(M, "shirt", "shirt", { placeholderHex: "bfdbfe", placeholderInk: "1e3a8a" }),
    clothesWord(M, "jeans", "jeans", { grammar: "plural", placeholderHex: "93c5fd", placeholderInk: "1e40af" }),
    clothesWord(M, "shoes", "shoes", { grammar: "plural", placeholderHex: "fde68a", placeholderInk: "92400e" }),
    clothesWord(M, "socks", "socks", { grammar: "plural", placeholderHex: "fecaca", placeholderInk: "991b1b" }),
    clothesWord(M, "hat", "hat", { placeholderHex: "fcd34d", placeholderInk: "a16207" }),
    clothesWord(M, "jacket", "jacket", { placeholderHex: "c4b5fd", placeholderInk: "5b21b6" }),
    clothesWord(M, "sweater", "sweater", { placeholderHex: "fda4af", placeholderInk: "9f1239" }),
    clothesWord(M, "shorts", "shorts", { grammar: "plural", placeholderHex: "a5f3fc", placeholderInk: "0e7490" }),
    clothesWord(M, "skirt", "skirt", { placeholderHex: "f9a8d4", placeholderInk: "9d174d" }),
    clothesWord(M, "dress", "dress", { placeholderHex: "fbcfe8", placeholderInk: "831843" }),
    clothesWord(M, "scarf", "scarf", {
      clozeA: "I wear a __1__.",
      clozeB: "My __1__ is warm.",
      placeholderHex: "fef08a",
      placeholderInk: "854d0e",
    }),
    clothesWord(M, "gloves", "gloves", { grammar: "plural", placeholderHex: "d1d5db", placeholderInk: "374151" }),
    clothesWord(M, "boots", "boots", { grammar: "plural", placeholderHex: "d6d3d1", placeholderInk: "44403c" }),
    clothesWord(M, "rain_coat", "raincoat", {
      grammar: "count",
      tts: "rain coat",
      clozeA: "I need my __1__ when it rains.",
      clozeB: "I put on my __1__.",
      placeholderHex: "fde047",
      placeholderInk: "a16207",
    }),
    clothesWord(M, "rain_boots", "rain boots", {
      grammar: "plural",
      tts: "rain boots",
      clozeA: "I wear my __1__ in the rain.",
      clozeB: "These are my __1__.",
      placeholderHex: "fbbf24",
      placeholderInk: "92400e",
    }),
  ],
  falseClaims: {
    shirt: ["This is a jacket.", "This is a sweater."],
    jeans: ["These are shorts.", "This is a skirt."],
    shoes: ["These are boots.", "These are socks."],
    socks: ["These are shoes.", "These are gloves."],
    hat: ["This is a scarf.", "This is a jacket."],
    jacket: ["This is a sweater.", "This is a raincoat."],
    sweater: ["This is a jacket.", "This is a shirt."],
    shorts: ["These are jeans.", "These are a skirt."],
    skirt: ["This is a dress.", "These are shorts."],
    dress: ["This is a skirt.", "This is a shirt."],
    scarf: ["This is a hat.", "This is a jacket."],
    gloves: ["These are socks.", "These are boots."],
    boots: ["These are shoes.", "These are rain boots."],
    rain_coat: ["This is a jacket.", "This is a sweater."],
    rain_boots: ["These are boots.", "These are shoes."],
  },
  learnExcludeWordIds: ["rain_coat", "rain_boots", "scarf"],
};
