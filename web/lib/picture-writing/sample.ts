import {
  DEFAULT_PICTURE_WRITING_INSTRUCTIONS,
  PICTURE_WRITING_KIND,
  type PictureWritingDocument,
} from "@/lib/picture-writing/types";
import { validatePictureWritingDocument } from "@/lib/picture-writing/document";

/** Sample lifted from Homework Template One Part 5. */
export function createSamplePictureWritingDocument(): PictureWritingDocument {
  return validatePictureWritingDocument({
    version: 1,
    kind: PICTURE_WRITING_KIND,
    id: "picture-writing-sample",
    title: "Write from a picture",
    instructions: DEFAULT_PICTURE_WRITING_INSTRUCTIONS,
    prompts: [
      {
        id: "write-mountain",
        imageUrl: "/pilots/homework-template-one/part-5-q1.jpg",
        imageAlt: "Two visitors looking at a snowy mountain and a village",
        question: "What did the visitors see?",
        promptWords: ["visitors", "saw", "snowy", "mountain"],
        requiredWords: ["visitors", "mountain"],
        sentenceStarter: "The visitors",
        minWords: 6,
      },
      {
        id: "write-garage",
        imageUrl: "/pilots/homework-template-one/part-5-q2.jpg",
        imageAlt: "A man looking at a very messy garage",
        question: "What did the man find?",
        promptWords: ["man", "garage", "messy", "found"],
        requiredWords: ["man", "garage"],
        sentenceStarter: "The man",
        minWords: 6,
      },
      {
        id: "write-television",
        imageUrl: "/pilots/homework-template-one/part-5-q3.jpg",
        imageAlt: "A child and an older man watching television together",
        question: "What did they do together?",
        promptWords: ["child", "grandfather", "watched", "television"],
        requiredWords: ["child", "television"],
        sentenceStarter: "The child",
        minWords: 7,
      },
      {
        id: "write-craft",
        imageUrl: "/pilots/homework-template-one/part-5-q5.jpg",
        imageAlt: "Three girls making models and crafts at a table",
        question: "What did the girls make?",
        promptWords: ["girls", "made", "models", "together"],
        requiredWords: ["girls", "models"],
        sentenceStarter: "The girls",
        minWords: 6,
      },
    ],
  });
}
