import { z } from "zod";
import { PRIMARY_READING_LEVELS } from "@/lib/activity-builder/reading/definition-match";

export const PICTURE_STORY_QUESTION_TYPES = ["sentence_completion", "multiple_choice"] as const;

const frameSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().trim().min(1, "Every story frame needs a picture.").max(1000),
  imageAlt: z.string().trim().min(1, "Describe every picture for accessibility.").max(240),
  text: z.string().trim().min(1, "Every story frame needs some text.").max(400),
});

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(PICTURE_STORY_QUESTION_TYPES),
  prompt: z.string().trim().min(1, "Every question needs a prompt.").max(240),
  acceptedAnswers: z.array(z.string().trim().min(1).max(100)).max(5),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(120) })).max(4),
  correctOptionId: z.string(),
  evidenceFrameId: z.string().min(1),
  feedback: z.string().trim().max(240).optional(),
});

export const pictureStoryDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  format: z.literal("picture_story_reading"),
  id: z.string().min(1),
  title: z.string().trim().min(1, "Add an activity title.").max(120),
  instructions: z.string().trim().min(1).max(240),
  learningObjective: z.string().trim().min(1).max(240),
  successCriteria: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  cefrLevel: z.enum(PRIMARY_READING_LEVELS),
  recommendedAgeMin: z.number().int().min(5).max(14),
  recommendedAgeMax: z.number().int().min(5).max(14),
  estimatedMinutes: z.number().int().min(1).max(25),
  attemptPolicy: z.enum(["retry_until_correct", "single_attempt"]),
  feedbackMode: z.enum(["immediate", "after_completion"]),
  content: z.object({
    frames: z.array(frameSchema).min(3, "Add at least three story frames.").max(6),
    questions: z.array(questionSchema).min(3, "Add at least three story questions.").max(6),
    allowStoryReviewDuringQuestions: z.boolean(),
  }),
}).superRefine((document, context) => {
  if (document.recommendedAgeMax < document.recommendedAgeMin) {
    context.addIssue({ code: "custom", path: ["recommendedAgeMax"], message: "Maximum age must be the same as or greater than minimum age." });
  }
  const frameIds = new Set(document.content.frames.map((frame) => frame.id));
  document.content.questions.forEach((question, index) => {
    if (!frameIds.has(question.evidenceFrameId)) {
      context.addIssue({ code: "custom", path: ["content", "questions", index], message: `Question ${index + 1} must point to a story frame.` });
    }
    if (question.type === "sentence_completion" && question.acceptedAnswers.length < 1) {
      context.addIssue({ code: "custom", path: ["content", "questions", index], message: `Question ${index + 1} needs an accepted answer.` });
    }
    if (question.type === "multiple_choice") {
      if (question.options.length < 2) {
        context.addIssue({ code: "custom", path: ["content", "questions", index], message: `Question ${index + 1} needs at least two choices.` });
      } else if (!question.options.some((option) => option.id === question.correctOptionId)) {
        context.addIssue({ code: "custom", path: ["content", "questions", index], message: `Question ${index + 1} needs a correct choice.` });
      }
    }
  });
});

export type PictureStoryDocument = z.infer<typeof pictureStoryDocumentSchema>;
export type PictureStoryFrame = PictureStoryDocument["content"]["frames"][number];
export type PictureStoryQuestion = PictureStoryDocument["content"]["questions"][number];

export function normalizePictureStoryAnswer(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/[.,!?;:'"]/g, "").toLocaleLowerCase();
}

export function isPictureStoryAnswerCorrect(value: string, question: PictureStoryQuestion): boolean {
  if (question.type !== "sentence_completion") return false;
  return question.acceptedAnswers.some((answer) => normalizePictureStoryAnswer(answer) === normalizePictureStoryAnswer(value));
}

export function createPictureStoryDraft(): PictureStoryDocument {
  const frames: PictureStoryFrame[] = [
    { id: crypto.randomUUID(), imageUrl: "https://placehold.co/640x400/e0f2fe/17375e?text=1%3A+Mia+finds+a+seed", imageAlt: "Mia finds a small seed beside the path.", text: "Mia finds a small seed beside the path. She puts it in her pocket." },
    { id: crypto.randomUUID(), imageUrl: "https://placehold.co/640x400/dcfce7/17375e?text=2%3A+Mia+plants+the+seed", imageAlt: "Mia plants the seed in a pot and waters it.", text: "At home, Mia plants the seed in a pot. She gives it a little water." },
    { id: crypto.randomUUID(), imageUrl: "https://placehold.co/640x400/fef3c7/17375e?text=3%3A+A+flower+grows", imageAlt: "Mia smiles at a yellow flower growing in the pot.", text: "Mia waits and cares for the seed. Soon, a bright yellow flower grows." },
  ];
  const choiceIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  return {
    schemaVersion: 1,
    format: "picture_story_reading",
    id: crypto.randomUUID(),
    title: "Mia's Little Seed",
    instructions: "Read each picture story page. Then complete the sentences and answer the questions.",
    learningObjective: "I can use pictures and words to understand the events in a short story.",
    successCriteria: ["I can put together clues from the pictures and story words.", "I can answer at least two questions correctly."],
    cefrLevel: "a1",
    recommendedAgeMin: 7,
    recommendedAgeMax: 10,
    estimatedMinutes: 8,
    attemptPolicy: "retry_until_correct",
    feedbackMode: "immediate",
    content: {
      frames,
      allowStoryReviewDuringQuestions: true,
      questions: [
        { id: crypto.randomUUID(), type: "sentence_completion", prompt: "Mia finds a small ____.", acceptedAnswers: ["seed"], options: [], correctOptionId: "", evidenceFrameId: frames[0]!.id, feedback: "Look at the first picture and sentence." },
        { id: crypto.randomUUID(), type: "multiple_choice", prompt: "What does Mia do at home?", acceptedAnswers: [], options: [{ id: choiceIds[0]!, text: "She plants the seed." }, { id: choiceIds[1]!, text: "She eats the seed." }, { id: choiceIds[2]!, text: "She loses the seed." }], correctOptionId: choiceIds[0]!, evidenceFrameId: frames[1]!.id, feedback: "The second frame shows what Mia does." },
        { id: crypto.randomUUID(), type: "sentence_completion", prompt: "A yellow ____ grows.", acceptedAnswers: ["flower"], options: [], correctOptionId: "", evidenceFrameId: frames[2]!.id, feedback: "Look at the final picture." },
      ],
    },
  };
}

export function pictureStoryValidationMessages(value: unknown): string[] {
  const result = pictureStoryDocumentSchema.safeParse(value);
  return result.success ? [] : [...new Set(result.error.issues.map((issue) => issue.message))];
}
