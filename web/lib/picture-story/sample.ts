import {
  DEFAULT_PICTURE_STORY_INSTRUCTIONS,
  PICTURE_STORY_KIND,
  type PictureStoryDocument,
} from "@/lib/picture-story/types";
import { validatePictureStoryDocument } from "@/lib/picture-story/document";

/** Sample Primary picture-story activity (Mia's Little Seed). */
export function createSamplePictureStoryDocument(): PictureStoryDocument {
  return validatePictureStoryDocument({
    version: 1,
    kind: PICTURE_STORY_KIND,
    id: "picture-story-sample",
    title: "Mia's Little Seed",
    instructions: DEFAULT_PICTURE_STORY_INSTRUCTIONS,
    allowStoryReviewDuringQuestions: true,
    frames: [
      {
        id: "f1",
        imageUrl: "https://placehold.co/640x400/e0f2fe/17375e?text=1%3A+Mia+finds+a+seed",
        imageAlt: "Mia finds a small seed beside the path.",
        text: "Mia finds a small seed beside the path. She puts it in her pocket.",
      },
      {
        id: "f2",
        imageUrl: "https://placehold.co/640x400/dcfce7/17375e?text=2%3A+Mia+plants+the+seed",
        imageAlt: "Mia plants the seed in a pot and waters it.",
        text: "At home, Mia plants the seed in a pot. She gives it a little water.",
      },
      {
        id: "f3",
        imageUrl: "https://placehold.co/640x400/fef3c7/17375e?text=3%3A+A+flower+grows",
        imageAlt: "Mia smiles at a yellow flower growing in the pot.",
        text: "Mia waits and cares for the seed. Soon, a bright yellow flower grows.",
      },
    ],
    questions: [
      {
        id: "q1",
        type: "sentence_completion",
        prompt: "Mia finds a small ____.",
        acceptedAnswers: ["seed"],
        options: [],
        correctOptionId: "",
        evidenceFrameId: "f1",
      },
      {
        id: "q2",
        type: "multiple_choice",
        prompt: "What does Mia do at home?",
        acceptedAnswers: [],
        options: [
          { id: "q2a", text: "She plants the seed." },
          { id: "q2b", text: "She eats the seed." },
          { id: "q2c", text: "She loses the seed." },
        ],
        correctOptionId: "q2a",
        evidenceFrameId: "f2",
      },
      {
        id: "q3",
        type: "sentence_completion",
        prompt: "A yellow ____ grows.",
        acceptedAnswers: ["flower"],
        options: [],
        correctOptionId: "",
        evidenceFrameId: "f3",
      },
    ],
  });
}
