import { DEFAULT_CHARACTER_CONFIG } from "@/lib/character/character-defaults";
import type { CharacterConfig } from "@/lib/character/character-types";

export type WorldPromptId = "clothes" | "fridge" | "desk" | "board";

export type WorldPromptChoice = {
  id: string;
  label: string;
};

export type WorldPrompt = {
  id: WorldPromptId;
  title: string;
  question: string;
  hint: string;
  choices: WorldPromptChoice[];
  answerId: string;
  success: string;
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

function topWord(topId: string): string {
  if (topId.includes("03") || topId.includes("hoodie")) return "hoodie";
  if (topId.includes("01")) return "t-shirt";
  return "shirt";
}

function bottomWord(bottomId: string): string {
  if (bottomId.includes("02") || bottomId.includes("short")) return "shorts";
  if (bottomId.includes("03") || bottomId.includes("skirt")) return "skirt";
  return "pants";
}

function shoeWord(shoeId: string): string {
  if (shoeId.includes("02")) return "boots";
  if (shoeId.includes("03")) return "sandals";
  return "shoes";
}

function clothingWord(config: CharacterConfig): { answerId: string; label: string; decoys: [string, string] } {
  const pool = [
    { answerId: "top", label: topWord(config.top), decoys: ["hat", "sock"] as [string, string] },
    { answerId: "bottom", label: bottomWord(config.bottom), decoys: ["coat", "scarf"] as [string, string] },
    { answerId: "shoes", label: shoeWord(config.shoes), decoys: ["bag", "belt"] as [string, string] },
  ];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function buildClothesPrompt(config: CharacterConfig = DEFAULT_CHARACTER_CONFIG): WorldPrompt {
  const pick = clothingWord(config);
  const choices = shuffle([
    { id: pick.answerId, label: pick.label },
    { id: "d1", label: pick.decoys[0] },
    { id: "d2", label: pick.decoys[1] },
  ]);
  return {
    id: "clothes",
    title: "Clothes",
    question: "What are you wearing?",
    hint: "Look at your avatar. Tap the English word.",
    choices,
    answerId: pick.answerId,
    success: `Yes — ${pick.label}!`,
  };
}

export function buildFridgePrompt(): WorldPrompt {
  const answer = { id: "milk", label: "milk" };
  return {
    id: "fridge",
    title: "Fridge",
    question: "What food word goes with a fridge?",
    hint: "Think of something cold to drink.",
    choices: shuffle([answer, { id: "sock", label: "sock" }, { id: "book", label: "book" }]),
    answerId: answer.id,
    success: "Yes — milk!",
  };
}

export function buildDeskPrompt(): WorldPrompt {
  const answer = { id: "desk", label: "desk" };
  return {
    id: "desk",
    title: "Classroom",
    question: "What is this?",
    hint: "You sit here to write and learn.",
    choices: shuffle([answer, { id: "bed", label: "bed" }, { id: "bus", label: "bus" }]),
    answerId: answer.id,
    success: "Yes — desk!",
  };
}

export function buildBoardPrompt(): WorldPrompt {
  const answer = { id: "board", label: "board" };
  return {
    id: "board",
    title: "Classroom",
    question: "What is on the wall?",
    hint: "Teachers write on it.",
    choices: shuffle([answer, { id: "door", label: "door" }, { id: "tree", label: "tree" }]),
    answerId: answer.id,
    success: "Yes — board!",
  };
}

export function buildWorldPrompt(id: WorldPromptId, config: CharacterConfig = DEFAULT_CHARACTER_CONFIG): WorldPrompt {
  if (id === "clothes") return buildClothesPrompt(config);
  if (id === "fridge") return buildFridgePrompt();
  if (id === "board") return buildBoardPrompt();
  return buildDeskPrompt();
}
