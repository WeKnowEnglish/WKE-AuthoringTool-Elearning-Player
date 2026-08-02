import {
  PICTURE_CLOZE_KIND,
  type PictureClozeDocument,
} from "@/lib/picture-cloze/types";
import { validatePictureClozeDocument } from "@/lib/picture-cloze/document";

/** Bakery / tools sample lifted from Homework Template One Part 1. */
export function createSamplePictureClozeDocument(): PictureClozeDocument {
  return validatePictureClozeDocument({
    version: 1,
    kind: PICTURE_CLOZE_KIND,
    id: "picture-cloze-tools-sample",
    title: "Look, choose, and complete",
    instructions:
      "Look at each picture. Choose a word from the bank and complete the sentence.",
    wordBank: [
      "hammer",
      "tape measure",
      "paint roller",
      "saw",
      "drill",
      "screwdriver",
    ],
    items: [
      {
        id: "cloze-1",
        imageUrl: "/pilots/homework-template-one/part-1-q1.jpg",
        imageAlt: "A boy building with wood and thinking about a hammer",
        prompt: "Which tool does he need?",
        sentenceBefore: "He needs a ",
        sentenceAfter: ".",
        acceptedAnswers: ["hammer"],
      },
      {
        id: "cloze-2",
        imageUrl: "/pilots/homework-template-one/part-1-q2.jpg",
        imageAlt: "Three girls measuring fabric and thinking about a tape measure",
        prompt: "Which tool do they need?",
        sentenceBefore: "They need a ",
        sentenceAfter: ".",
        acceptedAnswers: ["tape measure"],
      },
      {
        id: "cloze-3",
        imageUrl: "/pilots/homework-template-one/part-1-q3.jpg",
        imageAlt: "A woman holding paint and thinking about a paint roller",
        prompt: "Which tool does she need?",
        sentenceBefore: "She needs a ",
        sentenceAfter: ".",
        acceptedAnswers: ["paint roller"],
      },
      {
        id: "cloze-4",
        imageUrl: "/pilots/homework-template-one/part-1-q4.jpg",
        imageAlt: "A boy working with wood and thinking about a saw",
        prompt: "Which tool does he need?",
        sentenceBefore: "He needs a ",
        sentenceAfter: ".",
        acceptedAnswers: ["saw"],
      },
    ],
  });
}
