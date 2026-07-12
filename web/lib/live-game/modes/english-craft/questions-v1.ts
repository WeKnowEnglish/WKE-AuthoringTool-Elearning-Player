import "server-only";
import type {
  EnglishCraftCraftQuestionClient,
  EnglishCraftMcQuestionClient,
} from "@/lib/live-game/modes/english-craft/questions-client";

export type EnglishCraftMcQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
};

/** Pilot MC bank — server holds answers; client receives prompts only. */
export const ENGLISH_CRAFT_MC_QUESTIONS_V1: EnglishCraftMcQuestion[] = [
  {
    id: "mc-hot-cold",
    prompt: "What is the opposite of 'hot'?",
    options: ["cold", "warm", "big", "fast"],
    correctAnswer: "cold",
  },
  {
    id: "mc-happy-sad",
    prompt: "What is the opposite of 'happy'?",
    options: ["sad", "tired", "hungry", "late"],
    correctAnswer: "sad",
  },
  {
    id: "mc-big-small",
    prompt: "What is the opposite of 'big'?",
    options: ["small", "tall", "long", "wide"],
    correctAnswer: "small",
  },
  {
    id: "mc-day-night",
    prompt: "What is the opposite of 'day'?",
    options: ["night", "week", "morning", "time"],
    correctAnswer: "night",
  },
  {
    id: "mc-open-close",
    prompt: "What is the opposite of 'open'?",
    options: ["close", "shut", "lock", "stop"],
    correctAnswer: "close",
  },
  {
    id: "mc-fast-slow",
    prompt: "What is the opposite of 'fast'?",
    options: ["slow", "quick", "late", "soft"],
    correctAnswer: "slow",
  },
  {
    id: "mc-up-down",
    prompt: "What is the opposite of 'up'?",
    options: ["down", "over", "high", "top"],
    correctAnswer: "down",
  },
  {
    id: "mc-old-new",
    prompt: "What is the opposite of 'old'?",
    options: ["new", "young", "fresh", "modern"],
    correctAnswer: "new",
  },
  {
    id: "mc-light-dark",
    prompt: "What is the opposite of 'light'?",
    options: ["dark", "heavy", "dim", "black"],
    correctAnswer: "dark",
  },
  {
    id: "mc-clean-dirty",
    prompt: "What is the opposite of 'clean'?",
    options: ["dirty", "messy", "wet", "dusty"],
    correctAnswer: "dirty",
  },
  {
    id: "mc-start-finish",
    prompt: "What is the opposite of 'start'?",
    options: ["finish", "begin", "open", "run"],
    correctAnswer: "finish",
  },
  {
    id: "mc-easy-hard",
    prompt: "What is the opposite of 'easy'?",
    options: ["hard", "soft", "simple", "light"],
    correctAnswer: "hard",
  },
];

export function toClientMcQuestion(question: EnglishCraftMcQuestion): EnglishCraftMcQuestionClient {
  return {
    id: question.id,
    type: "multiple_choice",
    prompt: question.prompt,
    options: question.options,
  };
}

export function pickMcQuestionForNode(nodeId: string): EnglishCraftMcQuestion {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(i)) >>> 0;
  }
  const index = hash % ENGLISH_CRAFT_MC_QUESTIONS_V1.length;
  return ENGLISH_CRAFT_MC_QUESTIONS_V1[index]!;
}

export function getMcQuestionById(questionId: string): EnglishCraftMcQuestion | null {
  return ENGLISH_CRAFT_MC_QUESTIONS_V1.find((item) => item.id === questionId) ?? null;
}

export function isMcAnswerCorrect(questionId: string, answer: string): boolean {
  const question = ENGLISH_CRAFT_MC_QUESTIONS_V1.find((item) => item.id === questionId);
  if (!question) return false;
  return question.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
}

export type EnglishCraftCraftQuestion = {
  id: string;
  prompt: string;
  wordBank: string[];
  correctOrder: string[];
  slotCount: number;
};

export const ENGLISH_CRAFT_CRAFT_BRIDGE_V1: EnglishCraftCraftQuestion = {
  id: "craft-bridge-v1",
  prompt: "Put the words in order to craft the bridge:",
  wordBank: ["usually", "after school", "I", "play football"],
  correctOrder: ["I", "usually", "play football", "after school"],
  slotCount: 4,
};

export function toClientCraftQuestion(
  question: EnglishCraftCraftQuestion,
): EnglishCraftCraftQuestionClient {
  return {
    id: question.id,
    type: "drag_sentence",
    prompt: question.prompt,
    wordBank: question.wordBank,
    slotCount: question.slotCount,
  };
}

export function getCraftQuestionById(questionId: string): EnglishCraftCraftQuestion | null {
  if (questionId === ENGLISH_CRAFT_CRAFT_BRIDGE_V1.id) return ENGLISH_CRAFT_CRAFT_BRIDGE_V1;
  return null;
}

export function isCraftAnswerCorrect(questionId: string, order: readonly string[]): boolean {
  const question = getCraftQuestionById(questionId);
  if (!question) return false;
  if (order.length !== question.correctOrder.length) return false;
  return order.every((word, index) => word === question.correctOrder[index]);
}
