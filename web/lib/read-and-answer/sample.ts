import {
  DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
  READ_AND_ANSWER_KIND,
  type ReadAndAnswerDocument,
} from "@/lib/read-and-answer/types";
import { validateReadAndAnswerDocument } from "@/lib/read-and-answer/document";

/** Sample Primary read-and-answer activity (A Busy Saturday). */
export function createSampleReadAndAnswerDocument(): ReadAndAnswerDocument {
  return validateReadAndAnswerDocument({
    version: 1,
    kind: READ_AND_ANSWER_KIND,
    id: "read-and-answer-sample",
    title: "A Busy Saturday",
    instructions: DEFAULT_READ_AND_ANSWER_INSTRUCTIONS,
    shuffleOptions: true,
    passage: {
      title: "A Busy Saturday",
      text: "Mina gets up early on Saturday. She eats breakfast with her family. Then she rides her bike to the park. At the park, Mina meets her friend Leo. They play with a red ball and feed the ducks. Mina goes home before lunch because she is hungry.",
    },
    questions: [
      {
        id: "q1",
        prompt: "Where does Mina go after breakfast?",
        options: [
          { id: "q1a", text: "To the park" },
          { id: "q1b", text: "To school" },
          { id: "q1c", text: "To the shop" },
        ],
        correctOptionId: "q1a",
      },
      {
        id: "q2",
        prompt: "Who does Mina meet at the park?",
        options: [
          { id: "q2a", text: "Her sister" },
          { id: "q2b", text: "Leo" },
          { id: "q2c", text: "Her teacher" },
        ],
        correctOptionId: "q2b",
      },
      {
        id: "q3",
        prompt: "Why does Mina go home before lunch?",
        options: [
          { id: "q3a", text: "It starts to rain" },
          { id: "q3b", text: "Leo has to leave" },
          { id: "q3c", text: "She is hungry" },
        ],
        correctOptionId: "q3c",
      },
    ],
  });
}
