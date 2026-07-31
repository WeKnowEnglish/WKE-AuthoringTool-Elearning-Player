import { z } from "zod";
import { PRIMARY_READING_LEVELS } from "@/lib/activity-builder/reading/definition-match";

export const CLOZE_GAP_FOCUSES = ["vocabulary", "grammar", "connector", "reference"] as const;

const textSegmentSchema = z.object({ type: z.literal("text"), id: z.string().min(1), text: z.string().min(1, "Text segments cannot be empty.").max(800) });
const gapSegmentSchema = z.object({
  type: z.literal("gap"),
  id: z.string().min(1),
  options: z.array(z.string().trim().min(1, "Every gap choice needs text.").max(60)).min(2, "Every gap needs at least two choices.").max(4),
  correctAnswer: z.string().trim().min(1, "Every gap needs a correct answer.").max(60),
  focus: z.enum(CLOZE_GAP_FOCUSES),
  feedback: z.string().trim().max(240).optional(),
});

export const clozeChoiceDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  format: z.literal("reading_cloze_choice"),
  id: z.string().min(1),
  title: z.string().trim().min(1, "Add an activity title.").max(120),
  instructions: z.string().trim().min(1).max(240),
  learningObjective: z.string().trim().min(1).max(240),
  successCriteria: z.array(z.string().trim().min(1).max(200)).min(1).max(5),
  cefrLevel: z.enum(PRIMARY_READING_LEVELS),
  recommendedAgeMin: z.number().int().min(5).max(14),
  recommendedAgeMax: z.number().int().min(5).max(14),
  estimatedMinutes: z.number().int().min(1).max(20),
  attemptPolicy: z.enum(["retry_until_correct", "single_attempt"]),
  feedbackMode: z.enum(["immediate", "after_completion"]),
  content: z.object({
    passageTitle: z.string().trim().max(120).optional(),
    segments: z.array(z.discriminatedUnion("type", [textSegmentSchema, gapSegmentSchema])).min(3),
    shuffleOptions: z.boolean(),
  }),
}).superRefine((document, context) => {
  if (document.recommendedAgeMax < document.recommendedAgeMin) {
    context.addIssue({ code: "custom", path: ["recommendedAgeMax"], message: "Maximum age must be the same as or greater than minimum age." });
  }
  const gaps = document.content.segments.filter((segment) => segment.type === "gap");
  if (gaps.length !== 5) {
    context.addIssue({ code: "custom", path: ["content", "segments"], message: "Cloze with Choices requires exactly five gaps." });
  }
  document.content.segments.forEach((segment, index) => {
    if (segment.type !== "gap") return;
    if (!segment.options.includes(segment.correctAnswer)) {
      context.addIssue({ code: "custom", path: ["content", "segments", index, "correctAnswer"], message: `Gap ${gaps.indexOf(segment) + 1} needs a correct answer from its choices.` });
    }
    const normalized = segment.options.map((option) => option.toLocaleLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({ code: "custom", path: ["content", "segments", index, "options"], message: `Gap ${gaps.indexOf(segment) + 1} has duplicate choices.` });
    }
  });
});

export type ClozeChoiceDocument = z.infer<typeof clozeChoiceDocumentSchema>;
export type ClozeChoiceSegment = ClozeChoiceDocument["content"]["segments"][number];
export type ClozeChoiceGap = Extract<ClozeChoiceSegment, { type: "gap" }>;

function text(text: string): ClozeChoiceSegment { return { type: "text", id: crypto.randomUUID(), text }; }
function gap(correctAnswer: string, options: string[], focus: ClozeChoiceGap["focus"]): ClozeChoiceSegment {
  return { type: "gap", id: crypto.randomUUID(), correctAnswer, options, focus, feedback: "Read the whole sentence and check which word makes sense." };
}

export function createClozeChoiceDraft(): ClozeChoiceDocument {
  return {
    schemaVersion: 1,
    format: "reading_cloze_choice",
    id: crypto.randomUUID(),
    title: "A Morning at School",
    instructions: "Read the passage and choose the best word for each gap.",
    learningObjective: "I can use meaning and grammar clues to complete a short passage.",
    successCriteria: ["I can choose the correct word for at least four of five gaps."],
    cefrLevel: "a1",
    recommendedAgeMin: 7,
    recommendedAgeMax: 11,
    estimatedMinutes: 6,
    attemptPolicy: "retry_until_correct",
    feedbackMode: "after_completion",
    content: {
      passageTitle: "Sam’s School Morning",
      segments: [
        text("Sam wakes up "), gap("early", ["early", "blue", "slow"], "vocabulary"),
        text(" on Monday. He eats "), gap("breakfast", ["breakfast", "classroom", "football"], "vocabulary"),
        text(" and walks to school with "), gap("his", ["his", "her", "our"], "grammar"),
        text(" sister. In class, Sam reads a book "), gap("and", ["and", "but", "because"], "connector"),
        text(" writes three sentences. He feels "), gap("happy", ["happy", "hungry", "cold"], "vocabulary"),
        text(" because he finishes his work."),
      ],
      shuffleOptions: true,
    },
  };
}

export function clozeChoiceValidationMessages(value: unknown): string[] {
  const result = clozeChoiceDocumentSchema.safeParse(value);
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}
