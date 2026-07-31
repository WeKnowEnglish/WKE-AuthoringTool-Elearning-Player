import { z } from "zod";
import { PRIMARY_READING_LEVELS } from "@/lib/activity-builder/reading/definition-match";

export const READING_QUESTION_SKILLS = [
  "detail",
  "main_idea",
  "sequence",
  "vocabulary_in_context",
  "simple_inference",
] as const;

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1, "Every answer choice needs text.").max(180),
});

const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().trim().min(1, "Every question needs a prompt.").max(240),
  skill: z.enum(READING_QUESTION_SKILLS),
  options: z.array(optionSchema).min(2, "Each question needs at least two choices.").max(4),
  correctOptionId: z.string().min(1),
  explanation: z.string().trim().max(300).optional(),
  evidence: z.string().trim().max(300).optional(),
});

export const readAndAnswerDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  format: z.literal("reading_comprehension_mc"),
  id: z.string().min(1),
  title: z.string().trim().min(1, "Add an activity title.").max(120),
  instructions: z.string().trim().min(1).max(240),
  learningObjective: z.string().trim().min(1).max(240),
  successCriteria: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  cefrLevel: z.enum(PRIMARY_READING_LEVELS),
  recommendedAgeMin: z.number().int().min(5).max(14),
  recommendedAgeMax: z.number().int().min(5).max(14),
  estimatedMinutes: z.number().int().min(1).max(30),
  attemptPolicy: z.enum(["retry_until_correct", "single_attempt"]),
  feedbackMode: z.enum(["immediate", "after_completion"]),
  content: z.object({
    passage: z.object({
      title: z.string().trim().max(120).optional(),
      text: z.string().trim().min(40, "The passage should contain at least 40 characters.").max(1600),
      imageUrl: z.string().trim().url("The image must use a valid URL.").optional().or(z.literal("")),
      imageAlt: z.string().trim().max(200).optional(),
    }),
    questions: z.array(questionSchema).min(3, "Add at least three comprehension questions.").max(5),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
  }),
}).superRefine((document, context) => {
  if (document.recommendedAgeMax < document.recommendedAgeMin) {
    context.addIssue({ code: "custom", path: ["recommendedAgeMax"], message: "Maximum age must be the same as or greater than minimum age." });
  }
  if (document.content.passage.imageUrl && !document.content.passage.imageAlt?.trim()) {
    context.addIssue({ code: "custom", path: ["content", "passage", "imageAlt"], message: "Add alternative text for the passage image." });
  }
  document.content.questions.forEach((question, index) => {
    if (!question.options.some((option) => option.id === question.correctOptionId)) {
      context.addIssue({ code: "custom", path: ["content", "questions", index, "correctOptionId"], message: `Question ${index + 1} needs a correct answer.` });
    }
    const normalized = question.options.map((option) => option.text.toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({ code: "custom", path: ["content", "questions", index, "options"], message: `Question ${index + 1} has duplicate answer choices.` });
    }
  });
});

export type ReadAndAnswerDocument = z.infer<typeof readAndAnswerDocumentSchema>;
export type ReadAndAnswerQuestion = ReadAndAnswerDocument["content"]["questions"][number];

function newQuestion(index: number): ReadAndAnswerQuestion {
  const options = Array.from({ length: 3 }, (_, optionIndex) => ({ id: crypto.randomUUID(), text: `Choice ${optionIndex + 1}` }));
  return {
    id: crypto.randomUUID(),
    prompt: `Question ${index + 1}`,
    skill: index === 0 ? "main_idea" : "detail",
    options,
    correctOptionId: options[0]!.id,
    explanation: "Explain why this answer is correct.",
    evidence: "Add a useful clue from the passage.",
  };
}

export function createReadAndAnswerDraft(): ReadAndAnswerDocument {
  return {
    schemaVersion: 1,
    format: "reading_comprehension_mc",
    id: crypto.randomUUID(),
    title: "New read and answer activity",
    instructions: "Read the passage. Then answer the questions.",
    learningObjective: "I can understand the main idea and important details in a short passage.",
    successCriteria: ["I can answer at least three questions using information from the passage."],
    cefrLevel: "a1",
    recommendedAgeMin: 7,
    recommendedAgeMax: 11,
    estimatedMinutes: 8,
    attemptPolicy: "retry_until_correct",
    feedbackMode: "after_completion",
    content: {
      passage: {
        title: "A Busy Saturday",
        text: "Mina gets up early on Saturday. She eats breakfast with her family. Then she rides her bike to the park. At the park, Mina meets her friend Leo. They play with a red ball and feed the ducks. Mina goes home before lunch because she is hungry.",
        imageUrl: "",
        imageAlt: "",
      },
      questions: Array.from({ length: 3 }, (_, index) => newQuestion(index)),
      shuffleQuestions: false,
      shuffleOptions: true,
    },
  };
}

export function readAndAnswerValidationMessages(value: unknown): string[] {
  const result = readAndAnswerDocumentSchema.safeParse(value);
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}
