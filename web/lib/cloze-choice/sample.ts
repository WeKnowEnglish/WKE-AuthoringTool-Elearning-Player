import {
  CLOZE_CHOICE_KIND,
  DEFAULT_CLOZE_CHOICE_INSTRUCTIONS,
  type ClozeChoiceDocument,
} from "@/lib/cloze-choice/types";
import { validateClozeChoiceDocument } from "@/lib/cloze-choice/document";

/** Sample Primary cloze-with-choices activity. */
export function createSampleClozeChoiceDocument(): ClozeChoiceDocument {
  return validateClozeChoiceDocument({
    version: 1,
    kind: CLOZE_CHOICE_KIND,
    id: "cloze-choice-sample",
    title: "A Morning at School",
    instructions: DEFAULT_CLOZE_CHOICE_INSTRUCTIONS,
    passageTitle: "Sam’s School Morning",
    shuffleOptions: true,
    segments: [
      { type: "text", id: "t1", text: "Sam wakes up " },
      {
        type: "gap",
        id: "g1",
        correctAnswer: "early",
        options: ["early", "blue", "slow"],
      },
      { type: "text", id: "t2", text: " on Monday. He eats " },
      {
        type: "gap",
        id: "g2",
        correctAnswer: "breakfast",
        options: ["breakfast", "classroom", "football"],
      },
      { type: "text", id: "t3", text: " and walks to school with " },
      {
        type: "gap",
        id: "g3",
        correctAnswer: "his",
        options: ["his", "her", "our"],
      },
      { type: "text", id: "t4", text: " sister. In class, Sam reads a book " },
      {
        type: "gap",
        id: "g4",
        correctAnswer: "and",
        options: ["and", "but", "because"],
      },
      {
        type: "text",
        id: "t5",
        text: " writes three sentences. He feels ",
      },
      {
        type: "gap",
        id: "g5",
        correctAnswer: "happy",
        options: ["happy", "hungry", "cold"],
      },
      { type: "text", id: "t6", text: " because he finishes his work." },
    ],
  });
}
