import { z } from "zod";
import { PRIMARY_READING_LEVELS } from "@/lib/activity-builder/reading/definition-match";
import { CLOZE_GAP_FOCUSES } from "@/lib/activity-builder/reading/cloze-choice";

const textSegmentSchema = z.object({ type: z.literal("text"), id: z.string().min(1), text: z.string().min(1, "Text segments cannot be empty.").max(800) });
const gapSegmentSchema = z.object({
  type: z.literal("gap"),
  id: z.string().min(1),
  correctAnswers: z.array(z.string().trim().min(1, "Accepted answers cannot be empty.").max(60)).min(1, "Every gap needs an answer.").max(5),
  hint: z.string().trim().max(160).optional(),
  focus: z.enum(CLOZE_GAP_FOCUSES),
});

export const clozeOpenDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  format: z.literal("reading_cloze_open"),
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
    caseSensitive: z.boolean(),
    punctuationSensitive: z.boolean(),
    showHintsAfterFirstAttempt: z.boolean(),
  }),
}).superRefine((document, context) => {
  if (document.recommendedAgeMax < document.recommendedAgeMin) {
    context.addIssue({ code: "custom", path: ["recommendedAgeMax"], message: "Maximum age must be the same as or greater than minimum age." });
  }
  const gaps = document.content.segments.filter((segment) => segment.type === "gap");
  if (gaps.length < 3 || gaps.length > 5) {
    context.addIssue({ code: "custom", path: ["content", "segments"], message: "Open Cloze requires three to five gaps." });
  }
  gaps.forEach((gap, index) => {
    const normalized = gap.correctAnswers.map((answer) => normalizeOpenClozeAnswer(answer, document.content));
    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({ code: "custom", path: ["content", "segments"], message: `Gap ${index + 1} has duplicate accepted answers.` });
    }
  });
});

export type ClozeOpenDocument = z.infer<typeof clozeOpenDocumentSchema>;
export type ClozeOpenSegment = ClozeOpenDocument["content"]["segments"][number];
export type ClozeOpenGap = Extract<ClozeOpenSegment, { type: "gap" }>;

type NormalizationOptions = Pick<ClozeOpenDocument["content"], "caseSensitive" | "punctuationSensitive">;

export function normalizeOpenClozeAnswer(answer: string, options: NormalizationOptions): string {
  let value = answer.trim().replace(/\s+/g, " ");
  if (!options.punctuationSensitive) value = value.replace(/[.,!?;:'"()[\]{}]/g, "");
  if (!options.caseSensitive) value = value.toLocaleLowerCase();
  return value;
}

export function isOpenClozeAnswerCorrect(answer: string, gap: ClozeOpenGap, options: NormalizationOptions): boolean {
  const normalized = normalizeOpenClozeAnswer(answer, options);
  return gap.correctAnswers.some((accepted) => normalizeOpenClozeAnswer(accepted, options) === normalized);
}

function text(value: string): ClozeOpenSegment { return { type: "text", id: crypto.randomUUID(), text: value }; }
function gap(answer: string, hint: string, focus: ClozeOpenGap["focus"]): ClozeOpenSegment { return { type: "gap", id: crypto.randomUUID(), correctAnswers: [answer], hint, focus }; }

export function createClozeOpenDraft(): ClozeOpenDocument {
  return {
    schemaVersion: 1,
    format: "reading_cloze_open",
    id: crypto.randomUUID(),
    title: "The School Garden",
    instructions: "Read the passage and type the missing words.",
    learningObjective: "I can recall words that complete the meaning of a short passage.",
    successCriteria: ["I can type the correct word for at least three gaps."],
    cefrLevel: "a1",
    recommendedAgeMin: 8,
    recommendedAgeMax: 11,
    estimatedMinutes: 7,
    attemptPolicy: "retry_until_correct",
    feedbackMode: "immediate",
    content: {
      passageTitle: "Our Garden",
      segments: [
        text("Our class has a small "), gap("garden", "It is a place where plants grow.", "vocabulary"),
        text(" behind the school. We water the plants every "), gap("morning", "This comes before afternoon.", "vocabulary"),
        text(". Mia grows red tomatoes, and Ben "), gap("grows", "Use the action word for helping a plant get bigger.", "grammar"),
        text(" green beans. We are happy "), gap("because", "This word introduces a reason.", "connector"),
        text(" our vegetables are healthy."),
      ],
      caseSensitive: false,
      punctuationSensitive: false,
      showHintsAfterFirstAttempt: true,
    },
  };
}

export function clozeOpenValidationMessages(value: unknown): string[] {
  const result = clozeOpenDocumentSchema.safeParse(value);
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}
