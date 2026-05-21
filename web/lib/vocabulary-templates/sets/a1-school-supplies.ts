import type { VocabularySetDefinition } from "../types";
import { schoolSuppliesWord } from "./vocab-set-helpers";
import { SCHOOL_SUPPLIES_COVER_URL, SCHOOL_SUPPLIES_MEDIA_URLS } from "./school-media";

const M = SCHOOL_SUPPLIES_MEDIA_URLS;

export const A1_SCHOOL_SUPPLIES: VocabularySetDefinition = {
  id: "school_supplies",
  title: "Supplies & Subjects",
  learnPhraseTheme: "school_supplies",
  coverImageUrl: SCHOOL_SUPPLIES_COVER_URL,
  words: [
    schoolSuppliesWord(M, "pencil", "pencil", { placeholderHex: "fde68a", placeholderInk: "92400e" }),
    schoolSuppliesWord(M, "pen", "pen", { placeholderHex: "bfdbfe", placeholderInk: "1e3a8a" }),
    schoolSuppliesWord(M, "eraser", "eraser", { placeholderHex: "fecaca", placeholderInk: "991b1b" }),
    schoolSuppliesWord(M, "crayon", "crayon", { placeholderHex: "fca5a5", placeholderInk: "b91c1c" }),
    schoolSuppliesWord(M, "markers", "markers", {
      grammar: "plural",
      placeholderHex: "c4b5fd",
      placeholderInk: "5b21b6",
    }),
    schoolSuppliesWord(M, "backpack", "backpack", { placeholderHex: "93c5fd", placeholderInk: "1e40af" }),
    schoolSuppliesWord(M, "maths", "maths", { grammar: "uncountable", placeholderHex: "dbeafe", placeholderInk: "1d4ed8" }),
    schoolSuppliesWord(M, "english", "English", {
      grammar: "uncountable",
      placeholderHex: "bfdbfe",
      placeholderInk: "1e3a8a",
    }),
    schoolSuppliesWord(M, "art", "art", { grammar: "uncountable", placeholderHex: "fbcfe8", placeholderInk: "9d174d" }),
    schoolSuppliesWord(M, "book", "book", { placeholderHex: "fef3c7", placeholderInk: "a16207" }),
    schoolSuppliesWord(M, "notebook", "notebook", { placeholderHex: "e0e7ff", placeholderInk: "4338ca" }),
    schoolSuppliesWord(M, "ruler", "ruler", { placeholderHex: "d1d5db", placeholderInk: "374151" }),
    schoolSuppliesWord(M, "table", "table", {
      clozeA: "This is my __1__.",
      clozeB: "I sit at the __1__.",
      placeholderHex: "e7e5e4",
      placeholderInk: "44403c",
    }),
    schoolSuppliesWord(M, "lunchbox", "lunchbox", { placeholderHex: "fde047", placeholderInk: "a16207" }),
    schoolSuppliesWord(M, "scissors", "scissors", {
      grammar: "plural",
      clozeA: "I have __1__.",
      clozeB: "I use my __1__.",
      placeholderHex: "cbd5e1",
      placeholderInk: "475569",
    }),
  ],
  falseClaims: {
    pencil: ["This is a pen.", "This is an eraser."],
    pen: ["This is a pencil.", "This is a crayon."],
    eraser: ["This is a pencil.", "This is a pen."],
    crayon: ["This is a pencil.", "This is a marker."],
    markers: ["These are crayons.", "This is a pencil."],
    backpack: ["This is a lunchbox.", "This is a book."],
    maths: ["This is English.", "This is art."],
    english: ["This is maths.", "This is art."],
    art: ["This is maths.", "This is English."],
    book: ["This is a notebook.", "This is a pencil."],
    notebook: ["This is a book.", "This is a ruler."],
    ruler: ["This is a pencil.", "This is a pen."],
    table: ["This is a desk.", "This is a chair."],
    lunchbox: ["This is a backpack.", "This is a book."],
    scissors: ["This is a ruler.", "This is a pencil."],
  },
  learnExcludeWordIds: ["book", "notebook", "ruler"],
};
