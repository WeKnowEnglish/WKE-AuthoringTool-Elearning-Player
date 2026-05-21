import type { VocabularySetDefinition } from "../types";
import { bodyPartWord } from "./vocab-set-helpers";
import { BODY_HEAD_FACE_COVER_URL, BODY_HEAD_FACE_MEDIA_URLS } from "./body-media";

const M = BODY_HEAD_FACE_MEDIA_URLS;

export const A1_BODY_HEAD_FACE: VocabularySetDefinition = {
  id: "body_head_face",
  title: "Head & Face",
  learnPhraseTheme: "body_head_face",
  coverImageUrl: BODY_HEAD_FACE_COVER_URL,
  words: [
    bodyPartWord(M, "head", "head", { placeholderHex: "fecdd3", placeholderInk: "9f1239" }),
    bodyPartWord(M, "eye", "eye", { placeholderHex: "bfdbfe", placeholderInk: "1e40af" }),
    bodyPartWord(M, "ear", "ear", { placeholderHex: "fde68a", placeholderInk: "92400e" }),
    bodyPartWord(M, "nose", "nose", { placeholderHex: "fbcfe8", placeholderInk: "9d174d" }),
    bodyPartWord(M, "mouth", "mouth", { placeholderHex: "fca5a5", placeholderInk: "b91c1c" }),
    bodyPartWord(M, "lips", "lips", { grammar: "plural", placeholderHex: "f9a8d4", placeholderInk: "9d174d" }),
    bodyPartWord(M, "teeth", "teeth", { grammar: "plural", placeholderHex: "e5e7eb", placeholderInk: "374151" }),
    bodyPartWord(M, "cheeks", "cheeks", { grammar: "plural", placeholderHex: "fecaca", placeholderInk: "991b1b" }),
    bodyPartWord(M, "neck", "neck", { placeholderHex: "fed7aa", placeholderInk: "c2410c" }),
    bodyPartWord(M, "shoulder", "shoulder", { placeholderHex: "ddd6fe", placeholderInk: "5b21b6" }),
    bodyPartWord(M, "chest", "chest", { placeholderHex: "c4b5fd", placeholderInk: "6d28d9" }),
    bodyPartWord(M, "back", "back", { placeholderHex: "d1d5db", placeholderInk: "374151" }),
    bodyPartWord(M, "hand", "hand", { placeholderHex: "fde68a", placeholderInk: "a16207" }),
    bodyPartWord(M, "finger", "finger", { placeholderHex: "fef3c7", placeholderInk: "a16207" }),
    bodyPartWord(M, "elbow", "elbow", { placeholderHex: "e0e7ff", placeholderInk: "4338ca" }),
  ],
  falseClaims: {
    head: ["This is an ear.", "This is a nose."],
    eye: ["This is an ear.", "This is a mouth."],
    ear: ["This is an eye.", "This is a nose."],
    nose: ["This is a mouth.", "This is an ear."],
    mouth: ["This is a nose.", "These are teeth."],
    lips: ["These are teeth.", "This is a nose."],
    teeth: ["These are lips.", "This is a mouth."],
    cheeks: ["This is a nose.", "These are lips."],
    neck: ["This is a shoulder.", "This is a back."],
    shoulder: ["This is a neck.", "This is an elbow."],
    chest: ["This is a back.", "This is a stomach."],
    back: ["This is a chest.", "This is a neck."],
    hand: ["This is a foot.", "This is a finger."],
    finger: ["This is a hand.", "This is a toe."],
    elbow: ["This is a knee.", "This is a shoulder."],
  },
  learnExcludeWordIds: ["cheeks", "teeth", "elbow"],
};
