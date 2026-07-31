import { z } from "zod";

export const PRIMARY_READING_LEVELS = ["pre_a1", "a1", "a2"] as const;

const definitionEntrySchema = z.object({
  id: z.string().min(1),
  word: z.string().trim().min(1, "Every entry needs a word.").max(60),
  definition: z.string().trim().min(1, "Every entry needs a definition.").max(240),
  example: z.string().trim().max(240).optional(),
});

export const definitionMatchDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  format: z.literal("reading_definition_match"),
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
    entries: z.array(definitionEntrySchema).min(4, "Add at least four word-definition pairs.").max(10),
    distractors: z.array(z.string().trim().min(1).max(60)).max(4),
    shuffleWords: z.boolean(),
    shuffleDefinitions: z.boolean(),
  }),
}).superRefine((document, context) => {
  if (document.recommendedAgeMax < document.recommendedAgeMin) {
    context.addIssue({
      code: "custom",
      path: ["recommendedAgeMax"],
      message: "Maximum age must be the same as or greater than minimum age.",
    });
  }

  const normalizedWords = document.content.entries.map((entry) => entry.word.toLocaleLowerCase());
  if (new Set(normalizedWords).size !== normalizedWords.length) {
    context.addIssue({
      code: "custom",
      path: ["content", "entries"],
      message: "Each word must be unique.",
    });
  }

  document.content.entries.forEach((entry, index) => {
    const wordPattern = new RegExp(`\\b${entry.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (wordPattern.test(entry.definition)) {
      context.addIssue({
        code: "custom",
        path: ["content", "entries", index, "definition"],
        message: `The definition for “${entry.word}” should not contain the answer word.`,
      });
    }
  });
});

export type DefinitionMatchDocument = z.infer<typeof definitionMatchDocumentSchema>;
export type DefinitionMatchEntry = DefinitionMatchDocument["content"]["entries"][number];

export function createDefinitionMatchDraft(): DefinitionMatchDocument {
  const id = crypto.randomUUID();
  return {
    schemaVersion: 1,
    format: "reading_definition_match",
    id,
    title: "New definition match",
    instructions: "Match each word to its meaning.",
    learningObjective: "I can understand key words by reading their definitions.",
    successCriteria: ["I can match at least four words to their correct meanings."],
    cefrLevel: "a1",
    recommendedAgeMin: 7,
    recommendedAgeMax: 11,
    estimatedMinutes: 5,
    attemptPolicy: "retry_until_correct",
    feedbackMode: "immediate",
    content: {
      entries: Array.from({ length: 4 }, (_, index) => ({
        id: crypto.randomUUID(),
        word: `Word ${index + 1}`,
        definition: `A child-friendly meaning for item ${index + 1}.`,
        example: "",
      })),
      distractors: [],
      shuffleWords: true,
      shuffleDefinitions: false,
    },
  };
}

export function validateDefinitionMatchDocument(value: unknown): DefinitionMatchDocument {
  return definitionMatchDocumentSchema.parse(value);
}

export function definitionMatchValidationMessages(value: unknown): string[] {
  const result = definitionMatchDocumentSchema.safeParse(value);
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}
