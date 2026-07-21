import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  isPackFlashcardFace,
  normalizePackFlashcardOptions,
  type PackFlashcardCompiledCard,
  type PackFlashcardFace,
  type PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";

export type TeacherPackFlashcardSetStatus = "draft" | "published";

export type TeacherPackFlashcardSetRow = {
  id: string;
  teacher_id: string;
  pack_id: string | null;
  title: string;
  status: TeacherPackFlashcardSetStatus;
  word_ids: string[];
  options: PackFlashcardOptions & { seed?: string };
  cards: PackFlashcardCompiledCard[];
  warnings: string[];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type TeacherPackFlashcardSetSummary = {
  id: string;
  pack_id: string | null;
  title: string;
  status: TeacherPackFlashcardSetStatus;
  cardCount: number;
  wordCount: number;
  updated_at: string;
};

type DbRow = {
  id: string;
  teacher_id: string;
  pack_id: string | null;
  title: string;
  status: string;
  word_ids: unknown;
  options: unknown;
  cards: unknown;
  warnings: unknown;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function asStatus(value: string): TeacherPackFlashcardSetStatus {
  return value === "published" ? "published" : "draft";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asFaceList(value: unknown): PackFlashcardFace[] {
  if (!Array.isArray(value)) return [];
  const out: PackFlashcardFace[] = [];
  for (const item of value) {
    if (isPackFlashcardFace(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

function asOptions(value: unknown): PackFlashcardOptions & { seed?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return normalizePackFlashcardOptions({
      includeFaces: ["word", "definition"],
      frontFaces: ["word"],
      backFaces: ["definition"],
    });
  }
  const raw = value as Record<string, unknown>;
  const normalized = normalizePackFlashcardOptions({
    includeFaces: asFaceList(raw.includeFaces),
    frontFaces: asFaceList(raw.frontFaces),
    backFaces: asFaceList(raw.backFaces),
    shuffle: Boolean(raw.shuffle),
  });
  return {
    ...normalized,
    seed: typeof raw.seed === "string" ? raw.seed : undefined,
  };
}

function asCards(value: unknown): PackFlashcardCompiledCard[] {
  if (!Array.isArray(value)) return [];
  const out: PackFlashcardCompiledCard[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const wordId = typeof row.wordId === "string" ? row.wordId : "";
    if (!id || !wordId) continue;
    const facesRaw =
      row.faces && typeof row.faces === "object" && !Array.isArray(row.faces)
        ? (row.faces as Record<string, unknown>)
        : {};
    const faces: PackFlashcardCompiledCard["faces"] = {};
    if (typeof facesRaw.word === "string" && facesRaw.word.trim()) {
      faces.word = facesRaw.word.trim();
    }
    if (typeof facesRaw.definition === "string" && facesRaw.definition.trim()) {
      faces.definition = facesRaw.definition.trim();
    }
    if (typeof facesRaw.example === "string" && facesRaw.example.trim()) {
      faces.example = facesRaw.example.trim();
    }
    if (typeof facesRaw.pictureUrl === "string" && facesRaw.pictureUrl.trim()) {
      faces.pictureUrl = facesRaw.pictureUrl.trim();
    }
    out.push({
      id,
      wordId,
      faces,
      frontFaces: asFaceList(row.frontFaces),
      backFaces: asFaceList(row.backFaces),
    });
  }
  return out;
}

function mapRow(row: DbRow): TeacherPackFlashcardSetRow {
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    pack_id: row.pack_id,
    title: row.title,
    status: asStatus(row.status),
    word_ids: asStringArray(row.word_ids),
    options: asOptions(row.options),
    cards: asCards(row.cards),
    warnings: asWarnings(row.warnings),
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
  };
}

async function requireTeacherUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return user.id;
}

export const listTeacherPackFlashcardSets = cache(
  async function listTeacherPackFlashcardSets(options?: {
    packId?: string;
  }): Promise<TeacherPackFlashcardSetSummary[]> {
    noStore();
    await requireTeacherUserId();
    const supabase = await createClient();

    let query = supabase
      .from("teacher_pack_flashcard_sets")
      .select("id, pack_id, title, status, word_ids, cards, updated_at, archived_at")
      .is("archived_at", null)
      .order("updated_at", { ascending: false });

    if (options?.packId) {
      query = query.eq("pack_id", options.packId);
    }

    const { data, error } = await query;
    if (error) {
      if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(error.message)) {
        return [];
      }
      throw error;
    }

    return ((data ?? []) as Pick<
      DbRow,
      "id" | "pack_id" | "title" | "status" | "word_ids" | "cards" | "updated_at"
    >[]).map((row) => ({
      id: row.id,
      pack_id: row.pack_id,
      title: row.title,
      status: asStatus(row.status),
      cardCount: asCards(row.cards).length,
      wordCount: asStringArray(row.word_ids).length,
      updated_at: row.updated_at,
    }));
  },
);

export const getTeacherPackFlashcardSet = cache(async function getTeacherPackFlashcardSet(
  setId: string,
): Promise<TeacherPackFlashcardSetRow | null> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_pack_flashcard_sets")
    .select("*")
    .eq("id", setId)
    .maybeSingle();

  if (error) {
    if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(error.message)) {
      return null;
    }
    throw error;
  }
  if (!data) return null;
  return mapRow(data as DbRow);
});

export function mapTeacherPackFlashcardSetRow(
  row: Record<string, unknown>,
): TeacherPackFlashcardSetRow {
  return mapRow(row as unknown as DbRow);
}
