import type { VocabularySetDefinition } from "../types";
import { toyWord } from "./vocab-set-helpers";
import { TOYS_EVERYDAY_COVER_URL, TOYS_EVERYDAY_MEDIA_URLS } from "./toys-media";

const M = TOYS_EVERYDAY_MEDIA_URLS;

export const A1_TOYS_EVERYDAY: VocabularySetDefinition = {
  id: "toys_everyday",
  title: "Toys",
  learnPhraseTheme: "toys_everyday",
  coverImageUrl: TOYS_EVERYDAY_COVER_URL,
  words: [
    toyWord(M, "doll", "doll", { placeholderHex: "fbcfe8", placeholderInk: "9d174d" }),
    toyWord(M, "teddy_bear", "teddy bear", { tts: "teddy bear", placeholderHex: "fde68a", placeholderInk: "92400e" }),
    toyWord(M, "blocks", "blocks", { grammar: "plural", placeholderHex: "fed7aa", placeholderInk: "c2410c" }),
    toyWord(M, "kite", "kite", { placeholderHex: "bae6fd", placeholderInk: "0369a1" }),
    toyWord(M, "puppet", "puppet", { placeholderHex: "fecaca", placeholderInk: "991b1b" }),
    toyWord(M, "puzzles", "puzzles", { grammar: "plural", placeholderHex: "ddd6fe", placeholderInk: "5b21b6" }),
    toyWord(M, "balloon", "balloon", { placeholderHex: "fca5a5", placeholderInk: "b91c1c" }),
    toyWord(M, "legos", "Legos", { grammar: "plural", placeholderHex: "fef08a", placeholderInk: "a16207" }),
    toyWord(M, "stacking_ring", "stacking ring", {
      tts: "stacking ring",
      placeholderHex: "c4b5fd",
      placeholderInk: "6d28d9",
    }),
    toyWord(M, "yo_yo", "yo-yo", { tts: "yo-yo", placeholderHex: "e0e7ff", placeholderInk: "4338ca" }),
    toyWord(M, "action_figure", "action figure", {
      tts: "action figure",
      placeholderHex: "bfdbfe",
      placeholderInk: "1e40af",
    }),
    toyWord(M, "plush", "stuffed animals", {
      grammar: "plural",
      tts: "stuffed animals",
      clozeA: "I play with __1__.",
      clozeB: "I have __1__.",
      placeholderHex: "fde68a",
      placeholderInk: "a16207",
    }),
    toyWord(M, "toy_car", "toy car", { tts: "toy car", placeholderHex: "fecaca", placeholderInk: "b91c1c" }),
    toyWord(M, "marbles", "marbles", { grammar: "plural", placeholderHex: "e5e7eb", placeholderInk: "374151" }),
    toyWord(M, "board_game", "board game", {
      tts: "board game",
      placeholderHex: "d9f99d",
      placeholderInk: "166534",
    }),
  ],
  falseClaims: {
    doll: ["This is a teddy bear.", "This is a puppet."],
    teddy_bear: ["This is a doll.", "These are stuffed animals."],
    blocks: ["These are Legos.", "This is a puzzle."],
    kite: ["This is a balloon.", "This is a yo-yo."],
    puppet: ["This is a doll.", "This is an action figure."],
    puzzles: ["These are blocks.", "This is a board game."],
    balloon: ["This is a kite.", "This is a ball."],
    legos: ["These are blocks.", "This is a puzzle."],
    stacking_ring: ["This is a yo-yo.", "These are blocks."],
    yo_yo: ["This is a kite.", "This is a stacking ring."],
    action_figure: ["This is a doll.", "This is a puppet."],
    plush: ["This is a teddy bear.", "This is a doll."],
    toy_car: ["This is a doll.", "This is a kite."],
    marbles: ["These are blocks.", "This is a yo-yo."],
    board_game: ["These are puzzles.", "These are blocks."],
  },
  learnExcludeWordIds: ["marbles", "board_game", "toy_car"],
};
