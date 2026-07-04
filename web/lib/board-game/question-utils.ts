import { z } from "zod";
import { PAWN_COLORS } from "@/lib/board-game/constants";
import type { GameSetup, Player, Question } from "@/lib/board-game/types";

const multipleChoiceInputSchema = z.object({
  type: z.literal("multiple_choice"),
  id: z.string().optional(),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(3).max(4),
  correctAnswer: z.string().min(1),
});

const fillBlankInputSchema = z.object({
  type: z.literal("fill_blank"),
  id: z.string().optional(),
  sentence: z.string().min(1),
  correctAnswer: z.string().min(1),
});

const questionInputSchema = z.discriminatedUnion("type", [
  multipleChoiceInputSchema,
  fillBlankInputSchema,
]);

const questionsImportSchema = z.array(questionInputSchema);

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeQuestion(raw: z.infer<typeof questionInputSchema>): Question {
  const id = raw.id?.trim() || randomId();
  if (raw.type === "multiple_choice") {
    const options = raw.options.map((option) => option.trim());
    const correctAnswer = raw.correctAnswer.trim();
    if (!options.includes(correctAnswer)) {
      throw new Error(`Correct answer "${correctAnswer}" must match one of the options.`);
    }
    return {
      id,
      type: "multiple_choice",
      prompt: raw.prompt.trim(),
      options,
      correctAnswer,
    };
  }
  return {
    id,
    type: "fill_blank",
    sentence: raw.sentence.trim(),
    correctAnswer: raw.correctAnswer.trim(),
  };
}

export function parseQuestionsJson(text: string): Question[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON. Paste an array of question objects.");
  }
  const result = questionsImportSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid question format.");
  }
  return result.data.map(normalizeQuestion);
}

export function pickQuestion(
  questions: Question[],
  usedQuestionIds: string[],
  random: () => number = Math.random,
): { question: Question; usedQuestionIds: string[] } {
  if (questions.length === 0) {
    throw new Error("No questions available.");
  }

  let pool = usedQuestionIds;
  let available = questions.filter((question) => !pool.includes(question.id));
  if (available.length === 0) {
    pool = [];
    available = questions;
  }

  const index = Math.floor(random() * available.length);
  const question = available[index]!;
  return {
    question,
    usedQuestionIds: [...pool, question.id],
  };
}

export function formatBlankSentence(sentence: string): { before: string; after: string } {
  const markers = ["___", "[blank]", "____", "..."];
  for (const marker of markers) {
    const idx = sentence.indexOf(marker);
    if (idx !== -1) {
      return {
        before: sentence.slice(0, idx),
        after: sentence.slice(idx + marker.length),
      };
    }
  }
  return { before: sentence, after: "" };
}

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "sample-mc-1",
    type: "multiple_choice",
    prompt: "What color is the sky on a sunny day?",
    options: ["Blue", "Green", "Red", "Purple"],
    correctAnswer: "Blue",
  },
  {
    id: "sample-mc-2",
    type: "multiple_choice",
    prompt: "How many days are in a week?",
    options: ["Five", "Six", "Seven"],
    correctAnswer: "Seven",
  },
  {
    id: "sample-fill-1",
    type: "fill_blank",
    sentence: "I ___ to school every day.",
    correctAnswer: "walk",
  },
  {
    id: "sample-fill-2",
    type: "fill_blank",
    sentence: "She ___ English at We Know English Center.",
    correctAnswer: "studies",
  },
  {
    id: "sample-mc-3",
    type: "multiple_choice",
    prompt: "Which word is a fruit?",
    options: ["Chair", "Apple", "Pencil", "Window"],
    correctAnswer: "Apple",
  },
];

export function createDefaultPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: randomId(),
    name: `Player ${index + 1}`,
    color: PAWN_COLORS[index % PAWN_COLORS.length]!.hex,
  }));
}

export function createEmptySetup(playerCount = 3): GameSetup {
  return {
    schemaVersion: 1,
    playerCount,
    players: createDefaultPlayers(playerCount),
    boardPathStyle: "medium",
    mapId: "default-medium",
    questions: [],
  };
}
