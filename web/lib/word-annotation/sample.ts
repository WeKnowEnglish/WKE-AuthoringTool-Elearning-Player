import {
  DEFAULT_WORD_ANNOTATION_INSTRUCTIONS,
  DEFAULT_WORD_ANNOTATION_REMEMBER,
  WORD_ANNOTATION_KIND,
  type WordAnnotationDocument,
} from "@/lib/word-annotation/types";
import { validateWordAnnotationDocument } from "@/lib/word-annotation/document";

/** Sample lifted from Homework Template One Part 2. */
export function createSampleWordAnnotationDocument(): WordAnnotationDocument {
  return validateWordAnnotationDocument({
    version: 1,
    kind: WORD_ANNOTATION_KIND,
    id: "word-annotation-sample",
    title: "Adjectives and adverbs",
    instructions: DEFAULT_WORD_ANNOTATION_INSTRUCTIONS,
    rememberText: DEFAULT_WORD_ANNOTATION_REMEMBER,
    sentences: [
      {
        id: "mark-1",
        tokens: [
          { id: "m1-we", text: "We", role: null },
          { id: "m1-saw", text: "saw", role: null },
          { id: "m1-our", text: "our", role: null },
          { id: "m1-favourite", text: "favourite", role: "adjective" },
          { id: "m1-teacher", text: "teacher", role: null },
          { id: "m1-at", text: "at", role: null },
          { id: "m1-the", text: "the", role: null },
          { id: "m1-park", text: "park", role: null },
          { id: "m1-stop", text: ".", role: null },
        ],
      },
      {
        id: "mark-2",
        tokens: [
          { id: "m2-i", text: "I", role: null },
          { id: "m2-did", text: "did", role: null },
          { id: "m2-my", text: "my", role: null },
          { id: "m2-homework", text: "homework", role: null },
          { id: "m2-carefully", text: "carefully", role: "adverb" },
          { id: "m2-stop", text: ".", role: null },
        ],
      },
      {
        id: "mark-3",
        tokens: [
          { id: "m3-my", text: "My", role: null },
          { id: "m3-big", text: "big", role: "adjective" },
          { id: "m3-sister", text: "sister", role: null },
          { id: "m3-plays", text: "plays", role: null },
          { id: "m3-tennis", text: "tennis", role: null },
          { id: "m3-well", text: "well", role: "adverb" },
          { id: "m3-stop", text: ".", role: null },
        ],
      },
      {
        id: "mark-4",
        tokens: [
          { id: "m4-gloria", text: "Gloria", role: null },
          { id: "m4-poured", text: "poured", role: null },
          { id: "m4-the", text: "the", role: null },
          { id: "m4-yellow", text: "yellow", role: "adjective" },
          { id: "m4-paint", text: "paint", role: null },
          { id: "m4-slowly", text: "slowly", role: "adverb" },
          { id: "m4-stop", text: ".", role: null },
        ],
      },
      {
        id: "mark-5",
        tokens: [
          { id: "m5-the", text: "The", role: null },
          { id: "m5-children", text: "children", role: null },
          { id: "m5-played", text: "played", role: null },
          { id: "m5-games", text: "games", role: null },
          { id: "m5-happily", text: "happily", role: "adverb" },
          { id: "m5-in", text: "in", role: null },
          { id: "m5-the-2", text: "the", role: null },
          { id: "m5-garden", text: "garden", role: null },
          { id: "m5-stop", text: ".", role: null },
        ],
      },
    ],
  });
}
