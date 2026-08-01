import {
  DEFAULT_QUESTION_WRITING_INSTRUCTIONS,
  QUESTION_WRITING_KIND,
  type QuestionWritingDocument,
} from "@/lib/question-writing/types";
import { validateQuestionWritingDocument } from "@/lib/question-writing/document";

/** Sample lifted from Homework Template One Part 6. */
export function createSampleQuestionWritingDocument(): QuestionWritingDocument {
  return validateQuestionWritingDocument({
    version: 1,
    kind: QUESTION_WRITING_KIND,
    id: "question-writing-sample",
    title: "Write the questions",
    instructions: DEFAULT_QUESTION_WRITING_INSTRUCTIONS,
    workedExample: {
      prompt: "swim / in a river?",
      question: "Have you ever swum in a river?",
      answer: "Yes, I have. / No, I haven't.",
    },
    prompts: [
      {
        id: "question-1",
        promptWords: ["swim", "in a river?"],
        requiredWords: ["swum", "river"],
        questionWord: "Have",
        helpingVerbs: ["have"],
        minWords: 7,
        modelQuestion: "Have you ever swum in a river?",
      },
      {
        id: "question-2",
        promptWords: ["paint", "a set?"],
        requiredWords: ["painted", "set"],
        questionWord: "Have",
        helpingVerbs: ["have"],
        minWords: 6,
        modelQuestion: "Have you ever painted a set?",
      },
      {
        id: "question-3",
        promptWords: ["sing", "in a concert?"],
        requiredWords: ["sung", "concert"],
        questionWord: "Have",
        helpingVerbs: ["have"],
        minWords: 7,
        modelQuestion: "Have you ever sung in a concert?",
      },
      {
        id: "question-4",
        promptWords: ["ride", "an elephant?"],
        requiredWords: ["ridden", "elephant"],
        questionWord: "Have",
        helpingVerbs: ["have"],
        minWords: 6,
        modelQuestion: "Have you ever ridden an elephant?",
      },
      {
        id: "question-5",
        promptWords: ["make", "a cake?"],
        requiredWords: ["made", "cake"],
        questionWord: "Have",
        helpingVerbs: ["have"],
        minWords: 6,
        modelQuestion: "Have you ever made a cake?",
      },
    ],
  });
}
