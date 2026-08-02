import { z } from "zod";
import {
  isPictureClozeAnswerCorrect as scorePictureClozeAnswer,
  normalizePictureClozeAnswer,
} from "@/lib/picture-cloze/scoring";
import {
  scoreVerbTableAnswers,
  verbTableCellId as verbTableCellIdShared,
  type VerbFormColumn as SharedVerbFormColumn,
} from "@/lib/verb-table";
import {
  scoreSentenceColumnsAnswers,
  type SentenceColumnId as SharedSentenceColumnId,
} from "@/lib/sentence-columns";
import {
  scoreWordAnnotationAnswers,
  type WordAnnotationRole as SharedWordAnnotationRole,
} from "@/lib/word-annotation";
import {
  checkPictureWritingResponse,
  type PictureWritingCheck as SharedPictureWritingCheck,
} from "@/lib/picture-writing";
import {
  checkQuestionWritingResponse,
  type QuestionWritingCheck as SharedQuestionWritingCheck,
} from "@/lib/question-writing";

export const HOMEWORK_TEMPLATE_SECTION_KINDS = [
  "picture_cloze",
  "word_annotation",
  "sentence_columns",
  "verb_table",
  "picture_writing",
  "question_writing",
] as const;

const pictureClozeItemSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1),
  imageAlt: z.string().min(1),
  prompt: z.string().min(1),
  sentenceBefore: z.string(),
  sentenceAfter: z.string(),
  acceptedAnswers: z.array(z.string().trim().min(1)).min(1),
});

const readySectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1).max(6),
  title: z.string().min(1),
  skill: z.enum(["reading", "grammar", "vocabulary", "writing"]),
  kind: z.literal("picture_cloze"),
  status: z.literal("ready"),
  instructions: z.string().min(1),
  wordBank: z.array(z.string().trim().min(1)).min(4),
  items: z.array(pictureClozeItemSchema).length(4),
});

export const WORD_ANNOTATION_ROLES = ["adjective", "adverb"] as const;
const wordAnnotationSectionSchema = z.object({
  id: z.string().min(1),
  order: z.literal(2),
  title: z.string().min(1),
  skill: z.literal("grammar"),
  kind: z.literal("word_annotation"),
  status: z.literal("ready"),
  instructions: z.string().min(1),
  rememberText: z.string().min(1),
  sentences: z.array(z.object({
    id: z.string().min(1),
    tokens: z.array(z.object({
      id: z.string().min(1),
      text: z.string().min(1),
      role: z.enum(WORD_ANNOTATION_ROLES).nullable(),
    })).min(2),
  })).min(3).max(8),
});

export const SENTENCE_COLUMN_IDS = ["subject", "action", "extra"] as const;
const sentenceColumnsSectionSchema = z.object({
  id: z.string().min(1),
  order: z.literal(3),
  title: z.string().min(1),
  skill: z.literal("grammar"),
  kind: z.literal("sentence_columns"),
  status: z.literal("ready"),
  instructions: z.string().min(1),
  columns: z.array(z.object({ id: z.enum(SENTENCE_COLUMN_IDS), label: z.string().min(1), prompt: z.string().min(1) })).length(3),
  challenges: z.array(z.object({
    id: z.string().min(1),
    pieces: z.array(z.object({ id: z.string().min(1), text: z.string().min(1), columnId: z.enum(SENTENCE_COLUMN_IDS) })).length(3),
  })).min(3).max(6),
});

export const VERB_FORM_COLUMNS = ["base", "past", "participle"] as const;
const verbTableSectionSchema = z.object({
  id: z.string().min(1),
  order: z.literal(4),
  title: z.string().min(1),
  skill: z.literal("grammar"),
  kind: z.literal("verb_table"),
  status: z.literal("ready"),
  instructions: z.string().min(1),
  columns: z.array(z.object({ id: z.enum(VERB_FORM_COLUMNS), label: z.string().min(1) })).length(3),
  rows: z.array(z.object({
    id: z.string().min(1),
    forms: z.object({ base: z.string().min(1), past: z.string().min(1), participle: z.string().min(1) }),
    missing: z.array(z.enum(VERB_FORM_COLUMNS)).min(1).max(2),
  })).min(4).max(12),
});

const pictureWritingSectionSchema = z.object({
  id: z.string().min(1),
  order: z.literal(5),
  title: z.string().min(1),
  skill: z.literal("writing"),
  kind: z.literal("picture_writing"),
  status: z.literal("ready"),
  instructions: z.string().min(1),
  prompts: z.array(z.object({
    id: z.string().min(1), imageUrl: z.string().min(1), imageAlt: z.string().min(1), question: z.string().min(1),
    promptWords: z.array(z.string().trim().min(1)).min(2).max(5), requiredWords: z.array(z.string().trim().min(1)).min(1).max(4),
    sentenceStarter: z.string().optional(), minWords: z.number().int().min(4).max(20),
  })).min(2).max(5),
});

const questionWritingSectionSchema = z.object({
  id: z.string().min(1), order: z.literal(6), title: z.string().min(1), skill: z.literal("writing"),
  kind: z.literal("question_writing"), status: z.literal("ready"), instructions: z.string().min(1),
  workedExample: z.object({ prompt: z.string().min(1), question: z.string().min(1), answer: z.string().min(1) }),
  prompts: z.array(z.object({
    id: z.string().min(1), promptWords: z.array(z.string().trim().min(1)).min(2).max(8),
    requiredWords: z.array(z.string().trim().min(1)).min(2), questionWord: z.string().trim().min(1),
    helpingVerbs: z.array(z.string().trim().min(1)).min(1), minWords: z.number().int().min(3).max(15), modelQuestion: z.string().min(1),
  })).min(3).max(8),
});

const plannedSectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(1).max(6),
  title: z.string().min(1),
  skill: z.enum(["reading", "grammar", "vocabulary", "writing"]),
  kind: z.literal("question_writing"),
  status: z.literal("planned"),
  summary: z.string().min(1),
});

export const homeworkTemplateOneSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.literal("homework-template-one"),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  estimatedMinutes: z.number().int().min(1),
  sections: z.array(z.union([readySectionSchema, wordAnnotationSectionSchema, sentenceColumnsSectionSchema, verbTableSectionSchema, pictureWritingSectionSchema, questionWritingSectionSchema, plannedSectionSchema])).length(6),
}).superRefine((template, context) => {
  const orders = template.sections.map((section) => section.order);
  if (new Set(orders).size !== 6 || ![1, 2, 3, 4, 5, 6].every((order) => orders.includes(order))) {
    context.addIssue({ code: "custom", path: ["sections"], message: "Homework Template One needs sections 1–6 in order." });
  }
});

export type HomeworkTemplateOne = z.infer<typeof homeworkTemplateOneSchema>;
export type PictureClozeSection = Extract<HomeworkTemplateOne["sections"][number], { kind: "picture_cloze" }>;
export type WordAnnotationSection = Extract<HomeworkTemplateOne["sections"][number], { kind: "word_annotation" }>;
export type WordAnnotationRole = (typeof WORD_ANNOTATION_ROLES)[number];
export type SentenceColumnsSection = Extract<HomeworkTemplateOne["sections"][number], { kind: "sentence_columns" }>;
export type SentenceColumnId = (typeof SENTENCE_COLUMN_IDS)[number];
export type VerbTableSection = Extract<HomeworkTemplateOne["sections"][number], { kind: "verb_table" }>;
export type VerbFormColumn = (typeof VERB_FORM_COLUMNS)[number];
export type PictureWritingSection = Extract<HomeworkTemplateOne["sections"][number], { kind: "picture_writing" }>;
export type QuestionWritingSection = Extract<HomeworkTemplateOne["sections"][number], { kind: "question_writing"; status: "ready" }>;

export const HOMEWORK_TEMPLATE_ONE: HomeworkTemplateOne = {
  schemaVersion: 1,
  id: "homework-template-one",
  title: "Homework Template One",
  subtitle: "Reading, grammar, vocabulary, and writing practice",
  estimatedMinutes: 30,
  sections: [
    {
      id: "picture-cloze",
      order: 1,
      title: "Look, choose, and complete",
      skill: "vocabulary",
      kind: "picture_cloze",
      status: "ready",
      instructions: "Look at each picture. Choose a word from the bank and complete the sentence.",
      wordBank: ["hammer", "tape measure", "paint roller", "saw", "drill", "screwdriver"],
      items: [
        { id: "cloze-1", imageUrl: "/pilots/homework-template-one/part-1-q1.jpg", imageAlt: "A boy building with wood and thinking about a hammer", prompt: "Which tool does he need?", sentenceBefore: "He needs a ", sentenceAfter: ".", acceptedAnswers: ["hammer"] },
        { id: "cloze-2", imageUrl: "/pilots/homework-template-one/part-1-q2.jpg", imageAlt: "Three girls measuring fabric and thinking about a tape measure", prompt: "Which tool do they need?", sentenceBefore: "They need a ", sentenceAfter: ".", acceptedAnswers: ["tape measure"] },
        { id: "cloze-3", imageUrl: "/pilots/homework-template-one/part-1-q3.jpg", imageAlt: "A woman holding paint and thinking about a paint roller", prompt: "Which tool does she need?", sentenceBefore: "She needs a ", sentenceAfter: ".", acceptedAnswers: ["paint roller"] },
        { id: "cloze-4", imageUrl: "/pilots/homework-template-one/part-1-q4.jpg", imageAlt: "A boy working with wood and thinking about a saw", prompt: "Which tool does he need?", sentenceBefore: "He needs a ", sentenceAfter: ".", acceptedAnswers: ["saw"] },
      ],
    },
    {
      id: "word-annotation", order: 2, title: "Adjectives and adverbs", skill: "grammar", kind: "word_annotation", status: "ready",
      instructions: "Circle the adjectives. Underline the adverbs. Choose a marking tool, then tap the words.",
      rememberText: "An adjective describes a thing. An adverb describes an action.",
      sentences: [
        { id: "mark-1", tokens: [{ id: "m1-we", text: "We", role: null }, { id: "m1-saw", text: "saw", role: null }, { id: "m1-our", text: "our", role: null }, { id: "m1-favourite", text: "favourite", role: "adjective" }, { id: "m1-teacher", text: "teacher", role: null }, { id: "m1-at", text: "at", role: null }, { id: "m1-the", text: "the", role: null }, { id: "m1-park", text: "park", role: null }, { id: "m1-stop", text: ".", role: null }] },
        { id: "mark-2", tokens: [{ id: "m2-i", text: "I", role: null }, { id: "m2-did", text: "did", role: null }, { id: "m2-my", text: "my", role: null }, { id: "m2-homework", text: "homework", role: null }, { id: "m2-carefully", text: "carefully", role: "adverb" }, { id: "m2-stop", text: ".", role: null }] },
        { id: "mark-3", tokens: [{ id: "m3-my", text: "My", role: null }, { id: "m3-big", text: "big", role: "adjective" }, { id: "m3-sister", text: "sister", role: null }, { id: "m3-plays", text: "plays", role: null }, { id: "m3-tennis", text: "tennis", role: null }, { id: "m3-well", text: "well", role: "adverb" }, { id: "m3-stop", text: ".", role: null }] },
        { id: "mark-4", tokens: [{ id: "m4-gloria", text: "Gloria", role: null }, { id: "m4-poured", text: "poured", role: null }, { id: "m4-the", text: "the", role: null }, { id: "m4-yellow", text: "yellow", role: "adjective" }, { id: "m4-paint", text: "paint", role: null }, { id: "m4-slowly", text: "slowly", role: "adverb" }, { id: "m4-stop", text: ".", role: null }] },
        { id: "mark-5", tokens: [{ id: "m5-the", text: "The", role: null }, { id: "m5-children", text: "children", role: null }, { id: "m5-played", text: "played", role: null }, { id: "m5-games", text: "games", role: null }, { id: "m5-happily", text: "happily", role: "adverb" }, { id: "m5-in", text: "in", role: null }, { id: "m5-the-2", text: "the", role: null }, { id: "m5-garden", text: "garden", role: null }, { id: "m5-stop", text: ".", role: null }] },
      ],
    },
    {
      id: "sentence-columns", order: 3, title: "Build a sentence", skill: "grammar", kind: "sentence_columns", status: "ready",
      instructions: "Choose a sentence part, then place it in the correct column. Read the completed sentence underneath.",
      columns: [
        { id: "subject", label: "Who?", prompt: "The person or thing" },
        { id: "action", label: "Action", prompt: "What they do" },
        { id: "extra", label: "More information", prompt: "How, where, or what" },
      ],
      challenges: [
        { id: "build-1", pieces: [{ id: "b1-extra", text: "quickly", columnId: "extra" }, { id: "b1-subject", text: "The small dog", columnId: "subject" }, { id: "b1-action", text: "runs", columnId: "action" }] },
        { id: "build-2", pieces: [{ id: "b2-action", text: "is reading", columnId: "action" }, { id: "b2-extra", text: "a funny comic", columnId: "extra" }, { id: "b2-subject", text: "Mia", columnId: "subject" }] },
        { id: "build-3", pieces: [{ id: "b3-subject", text: "The children", columnId: "subject" }, { id: "b3-extra", text: "in the playground", columnId: "extra" }, { id: "b3-action", text: "are playing", columnId: "action" }] },
        { id: "build-4", pieces: [{ id: "b4-action", text: "carries", columnId: "action" }, { id: "b4-subject", text: "Ben", columnId: "subject" }, { id: "b4-extra", text: "the heavy box carefully", columnId: "extra" }] },
      ],
    },
    {
      id: "verb-table", order: 4, title: "Complete the verb table", skill: "grammar", kind: "verb_table", status: "ready",
      instructions: "Use the given verb forms to complete each empty cell.",
      columns: [{ id: "base", label: "Base verb" }, { id: "past", label: "Past tense" }, { id: "participle", label: "Past participle" }],
      rows: [
        { id: "verb-go", forms: { base: "go", past: "went", participle: "gone" }, missing: ["past"] },
        { id: "verb-play", forms: { base: "play", past: "played", participle: "played" }, missing: ["participle"] },
        { id: "verb-see", forms: { base: "see", past: "saw", participle: "seen" }, missing: ["past", "participle"] },
        { id: "verb-eat", forms: { base: "eat", past: "ate", participle: "eaten" }, missing: ["base"] },
        { id: "verb-write", forms: { base: "write", past: "wrote", participle: "written" }, missing: ["past"] },
        { id: "verb-be", forms: { base: "be", past: "was/were", participle: "been" }, missing: ["participle"] },
      ],
    },
    {
      id: "picture-writing", order: 5, title: "Write from a picture", skill: "writing", kind: "picture_writing", status: "ready",
      instructions: "Look carefully at each picture. Use the prompt words to write one complete sentence.",
      prompts: [
        { id: "write-mountain", imageUrl: "/pilots/homework-template-one/part-5-q1.jpg", imageAlt: "Two visitors looking at a snowy mountain and a village", question: "What did the visitors see?", promptWords: ["visitors", "saw", "snowy", "mountain"], requiredWords: ["visitors", "mountain"], sentenceStarter: "The visitors", minWords: 6 },
        { id: "write-garage", imageUrl: "/pilots/homework-template-one/part-5-q2.jpg", imageAlt: "A man looking at a very messy garage", question: "What did the man find?", promptWords: ["man", "garage", "messy", "found"], requiredWords: ["man", "garage"], sentenceStarter: "The man", minWords: 6 },
        { id: "write-television", imageUrl: "/pilots/homework-template-one/part-5-q3.jpg", imageAlt: "A child and an older man watching television together", question: "What did they do together?", promptWords: ["child", "grandfather", "watched", "television"], requiredWords: ["child", "television"], sentenceStarter: "The child", minWords: 7 },
        { id: "write-craft", imageUrl: "/pilots/homework-template-one/part-5-q5.jpg", imageAlt: "Three girls making models and crafts at a table", question: "What did the girls make?", promptWords: ["girls", "made", "models", "together"], requiredWords: ["girls", "models"], sentenceStarter: "The girls", minWords: 6 },
      ],
    },
    {
      id: "question-writing", order: 6, title: "Write the questions", skill: "writing", kind: "question_writing", status: "ready",
      instructions: "Use the prompts to write Have you ever...? questions. Change each verb to its past participle.",
      workedExample: { prompt: "swim / in a river?", question: "Have you ever swum in a river?", answer: "Yes, I have. / No, I haven't." },
      prompts: [
        { id: "question-1", promptWords: ["swim", "in a river?"], requiredWords: ["swum", "river"], questionWord: "Have", helpingVerbs: ["have"], minWords: 7, modelQuestion: "Have you ever swum in a river?" },
        { id: "question-2", promptWords: ["paint", "a set?"], requiredWords: ["painted", "set"], questionWord: "Have", helpingVerbs: ["have"], minWords: 6, modelQuestion: "Have you ever painted a set?" },
        { id: "question-3", promptWords: ["sing", "in a concert?"], requiredWords: ["sung", "concert"], questionWord: "Have", helpingVerbs: ["have"], minWords: 7, modelQuestion: "Have you ever sung in a concert?" },
        { id: "question-4", promptWords: ["ride", "an elephant?"], requiredWords: ["ridden", "elephant"], questionWord: "Have", helpingVerbs: ["have"], minWords: 6, modelQuestion: "Have you ever ridden an elephant?" },
        { id: "question-5", promptWords: ["make", "a cake?"], requiredWords: ["made", "cake"], questionWord: "Have", helpingVerbs: ["have"], minWords: 6, modelQuestion: "Have you ever made a cake?" },
      ],
    },
  ],
};

export function normalizeTemplateAnswer(value: string): string {
  return normalizePictureClozeAnswer(value);
}

export function isPictureClozeAnswerCorrect(value: string, acceptedAnswers: string[]): boolean {
  return scorePictureClozeAnswer(value, acceptedAnswers);
}

export function scoreWordAnnotations(
  section: WordAnnotationSection,
  annotations: Record<string, WordAnnotationRole>,
): { correct: number; expected: number; incorrect: number } {
  return scoreWordAnnotationAnswers(
    section.sentences,
    annotations as Record<string, SharedWordAnnotationRole>,
  );
}

export function scoreSentenceColumns(
  section: SentenceColumnsSection,
  placements: Record<string, SentenceColumnId>,
): { correct: number; total: number } {
  return scoreSentenceColumnsAnswers(
    section.challenges,
    placements as Record<string, SharedSentenceColumnId>,
  );
}

export function verbTableCellId(rowId: string, column: VerbFormColumn): string {
  return verbTableCellIdShared(rowId, column as SharedVerbFormColumn);
}

export function scoreVerbTable(
  section: VerbTableSection,
  answers: Record<string, string>,
): { correct: number; total: number } {
  return scoreVerbTableAnswers(section.rows, answers);
}

export type PictureWritingCheck = SharedPictureWritingCheck;

export function checkPictureWriting(
  response: string,
  prompt: PictureWritingSection["prompts"][number],
): PictureWritingCheck {
  return checkPictureWritingResponse(response, prompt);
}

export type QuestionWritingCheck = SharedQuestionWritingCheck;

export function checkQuestionWriting(
  response: string,
  prompt: QuestionWritingSection["prompts"][number],
): QuestionWritingCheck {
  return checkQuestionWritingResponse(response, prompt);
}
