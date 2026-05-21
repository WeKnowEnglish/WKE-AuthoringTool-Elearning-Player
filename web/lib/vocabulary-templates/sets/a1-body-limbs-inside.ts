import type { VocabularySetDefinition } from "../types";
import { bodyPartWord } from "./vocab-set-helpers";
import { BODY_LIMBS_INSIDE_COVER_URL, BODY_LIMBS_INSIDE_MEDIA_URLS } from "./body-media";

const M = BODY_LIMBS_INSIDE_MEDIA_URLS;

export const A1_BODY_LIMBS_INSIDE: VocabularySetDefinition = {
  id: "body_limbs_inside",
  title: "Arms, Legs & Inside",
  learnPhraseTheme: "body_limbs_inside",
  coverImageUrl: BODY_LIMBS_INSIDE_COVER_URL,
  words: [
    bodyPartWord(M, "arm", "arm", { placeholderHex: "bfdbfe", placeholderInk: "1e40af" }),
    bodyPartWord(M, "leg", "leg", { placeholderHex: "93c5fd", placeholderInk: "1d4ed8" }),
    bodyPartWord(M, "knee", "knee", { placeholderHex: "c4b5fd", placeholderInk: "6d28d9" }),
    bodyPartWord(M, "ankle", "ankle", { placeholderHex: "ddd6fe", placeholderInk: "5b21b6" }),
    bodyPartWord(M, "feet", "feet", { grammar: "plural", placeholderHex: "fde68a", placeholderInk: "a16207" }),
    bodyPartWord(M, "toes", "toes", { grammar: "plural", placeholderHex: "fecaca", placeholderInk: "991b1b" }),
    bodyPartWord(M, "stomach", "stomach", { placeholderHex: "fed7aa", placeholderInk: "c2410c" }),
    bodyPartWord(M, "heart", "heart", { placeholderHex: "fca5a5", placeholderInk: "b91c1c" }),
    bodyPartWord(M, "bone", "bone", { placeholderHex: "e5e7eb", placeholderInk: "374151" }),
    bodyPartWord(M, "muscle", "muscle", { placeholderHex: "fecdd3", placeholderInk: "9f1239" }),
    bodyPartWord(M, "cell", "cell", { placeholderHex: "dbeafe", placeholderInk: "1e3a8a" }),
    bodyPartWord(M, "organs", "organs", {
      grammar: "plural",
      clozeA: "These are my __1__.",
      clozeB: "I have __1__.",
      placeholderHex: "fbcfe8",
      placeholderInk: "9d174d",
    }),
    bodyPartWord(M, "skin", "skin", {
      grammar: "uncountable",
      clozeA: "This is my __1__.",
      clozeB: "I have __1__.",
      placeholderHex: "fde68a",
      placeholderInk: "92400e",
    }),
    bodyPartWord(M, "brain", "brain", { placeholderHex: "e9d5ff", placeholderInk: "7e22ce" }),
    bodyPartWord(M, "lung", "lung", { placeholderHex: "bae6fd", placeholderInk: "0369a1" }),
  ],
  falseClaims: {
    arm: ["This is a leg.", "This is a hand."],
    leg: ["This is an arm.", "This is a foot."],
    knee: ["This is an ankle.", "This is an elbow."],
    ankle: ["This is a knee.", "This is a toe."],
    feet: ["These are hands.", "These are toes."],
    toes: ["These are fingers.", "These are feet."],
    stomach: ["This is a heart.", "This is a chest."],
    heart: ["This is a stomach.", "This is a bone."],
    bone: ["This is a muscle.", "This is a cell."],
    muscle: ["This is a bone.", "This is a heart."],
    cell: ["This is a bone.", "These are organs."],
    organs: ["This is a heart.", "This is a stomach."],
    skin: ["This is a bone.", "This is a muscle."],
    brain: ["This is a heart.", "This is a lung."],
    lung: ["This is a heart.", "This is a brain."],
  },
  learnExcludeWordIds: ["cell", "organs", "brain"],
};
