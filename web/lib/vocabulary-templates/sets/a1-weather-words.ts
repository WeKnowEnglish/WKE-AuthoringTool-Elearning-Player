import type { VocabularySetDefinition } from "../types";
import { weatherWord } from "./vocab-set-helpers";
import { WEATHER_WORDS_COVER_URL, WEATHER_WORDS_MEDIA_URLS } from "./weather-media";

const M = WEATHER_WORDS_MEDIA_URLS;

export const A1_WEATHER_WORDS: VocabularySetDefinition = {
  id: "weather_words",
  title: "Weather Words",
  learnPhraseTheme: "weather",
  coverImageUrl: WEATHER_WORDS_COVER_URL,
  words: [
    weatherWord(M, "sun", "sun", { grammar: "count", placeholderHex: "fde047", placeholderInk: "a16207" }),
    weatherWord(M, "cloud", "cloud", { grammar: "count", placeholderHex: "e2e8f0", placeholderInk: "475569" }),
    weatherWord(M, "rain", "rain", {
      grammar: "uncountable",
      clozeA: "I see __1__.",
      clozeB: "The __1__ is falling.",
      placeholderHex: "93c5fd",
      placeholderInk: "1e3a8a",
    }),
    weatherWord(M, "snow", "snow", {
      grammar: "uncountable",
      clozeA: "I see __1__.",
      clozeB: "There is __1__ on the ground.",
      placeholderHex: "f1f5f9",
      placeholderInk: "334155",
    }),
    weatherWord(M, "wind", "wind", {
      grammar: "uncountable",
      clozeA: "I feel the __1__.",
      clozeB: "The __1__ is strong.",
      placeholderHex: "a5f3fc",
      placeholderInk: "0c4a6e",
    }),
    weatherWord(M, "storm", "storm", { grammar: "count", placeholderHex: "64748b", placeholderInk: "0f172a" }),
    weatherWord(M, "lightning", "lightning", {
      grammar: "uncountable",
      clozeA: "I see __1__.",
      clozeB: "The sky has __1__.",
      placeholderHex: "fef08a",
      placeholderInk: "854d0e",
    }),
    weatherWord(M, "sunny", "sunny", { grammar: "uncountable", placeholderHex: "fde047", placeholderInk: "ca8a04" }),
    weatherWord(M, "cloudy", "cloudy", { grammar: "uncountable", placeholderHex: "cbd5e1", placeholderInk: "475569" }),
    weatherWord(M, "rainy", "rainy", {
      grammar: "uncountable",
      clozeA: "It is __1__.",
      clozeB: "I need my rain coat. It is __1__.",
      placeholderHex: "7dd3fc",
      placeholderInk: "0369a1",
    }),
    weatherWord(M, "snowy", "snowy", { grammar: "uncountable", placeholderHex: "e2e8f0", placeholderInk: "64748b" }),
    weatherWord(M, "windy", "windy", { grammar: "uncountable", placeholderHex: "bae6fd", placeholderInk: "075985" }),
    weatherWord(M, "hot", "hot", { grammar: "uncountable", placeholderHex: "fca5a5", placeholderInk: "b91c1c" }),
    weatherWord(M, "cold", "cold", { grammar: "uncountable", placeholderHex: "bfdbfe", placeholderInk: "1d4ed8" }),
    weatherWord(M, "warm", "warm", { grammar: "uncountable", placeholderHex: "fdba74", placeholderInk: "c2410c" }),
  ],
  falseClaims: {
    sun: ["This is a cloud.", "This is hot."],
    cloud: ["This is the sun.", "This is rainy."],
    rain: ["This is snow.", "This is windy."],
    snow: ["This is rain.", "This is cold."],
    wind: ["This is a storm.", "This is rainy."],
    storm: ["This is lightning.", "This is a cloud."],
    lightning: ["This is a storm.", "This is rain."],
    sunny: ["This is rainy.", "This is cloudy."],
    cloudy: ["This is sunny.", "This is rainy."],
    rainy: ["This is sunny.", "This is snowy."],
    snowy: ["This is rainy.", "This is sunny."],
    windy: ["This is rainy.", "This is cloudy."],
    hot: ["This is cold.", "This is warm."],
    cold: ["This is hot.", "This is warm."],
    warm: ["This is cold.", "This is hot."],
  },
  learnExcludeWordIds: ["lightning", "storm", "wind"],
};
