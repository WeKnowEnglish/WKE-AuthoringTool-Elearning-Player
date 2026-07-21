import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import {
  isPackFlashcardFace,
  sortPackFlashcardFaces,
  type PackFlashcardCompiledCard,
  type PackFlashcardFace,
  type PackFlashcardFaceSnapshot,
  type PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";

const MAX_FROZEN_CARDS = 200;

function asFaceList(value: unknown): PackFlashcardFace[] {
  if (!Array.isArray(value)) return [];
  const out: PackFlashcardFace[] = [];
  for (const item of value) {
    if (isPackFlashcardFace(item) && !out.includes(item)) out.push(item);
  }
  return sortPackFlashcardFaces(out);
}

function asFaceSnapshot(value: unknown): PackFlashcardFaceSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const faces: PackFlashcardFaceSnapshot = {};
  if (typeof raw.word === "string" && raw.word.trim()) faces.word = raw.word.trim();
  if (typeof raw.definition === "string" && raw.definition.trim()) {
    faces.definition = raw.definition.trim();
  }
  if (typeof raw.example === "string" && raw.example.trim()) {
    faces.example = raw.example.trim();
  }
  if (typeof raw.pictureUrl === "string" && raw.pictureUrl.trim()) {
    faces.pictureUrl = raw.pictureUrl.trim();
  }
  return faces;
}

export function parseStoredPackFlashcardCards(raw: unknown): PackFlashcardCompiledCard[] {
  if (!Array.isArray(raw)) return [];
  const out: PackFlashcardCompiledCard[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const wordId = typeof row.wordId === "string" ? row.wordId.trim() : "";
    if (!id || !wordId) continue;
    const faces = asFaceSnapshot(row.faces);
    if (!faces.word && !faces.definition && !faces.example && !faces.pictureUrl) {
      continue;
    }
    out.push({
      id,
      wordId,
      faces,
      frontFaces: asFaceList(row.frontFaces),
      backFaces: asFaceList(row.backFaces),
    });
    if (out.length >= MAX_FROZEN_CARDS) break;
  }
  return out;
}

export type PackFlashcardsHomeworkPayload = Extract<
  ClassHomeworkPayload,
  { type: "pack_flashcards" }
>;

/**
 * Build a pack_flashcards homework payload from the current set cards.
 * Always writes the provided cards (homework tracks the latest set version).
 */
export function freezePackFlashcardsPayload(input: {
  setId: string;
  setTitle: string;
  cards: readonly PackFlashcardCompiledCard[];
  options?: PackFlashcardOptions | null;
  frozenAt?: string;
}): PackFlashcardsHomeworkPayload {
  const cards = [...input.cards].slice(0, MAX_FROZEN_CARDS);
  const options = input.options
    ? {
        includeFaces: [...input.options.includeFaces],
        frontFaces: [...input.options.frontFaces],
        backFaces: [...input.options.backFaces],
        shuffle: Boolean(input.options.shuffle),
      }
    : undefined;
  return {
    type: "pack_flashcards",
    setId: input.setId,
    setTitle: input.setTitle.trim() || "Flashcards",
    cardCount: cards.length,
    cards,
    ...(options ? { options } : {}),
    frozenAt: input.frozenAt ?? new Date().toISOString(),
  };
}
