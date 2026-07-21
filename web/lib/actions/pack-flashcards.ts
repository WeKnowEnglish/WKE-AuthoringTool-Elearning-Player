"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTeacher } from "@/lib/auth/roles";
import {
  mapTeacherPackFlashcardSetRow,
  type TeacherPackFlashcardSetRow,
} from "@/lib/data/teacher-pack-flashcards";
import { getTeacherWordPack } from "@/lib/data/teacher-word-packs";
import { createClient } from "@/lib/supabase/server";
import {
  validatePackFlashcardOptions,
  type PackFlashcardCompiledCard,
  type PackFlashcardDraft,
  type PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";

export type SavePackFlashcardSetResult =
  | { ok: true; set: TeacherPackFlashcardSetRow }
  | { ok: false; error: string };

export type UpdatePackFlashcardSetResult =
  | { ok: true; set: TeacherPackFlashcardSetRow }
  | { ok: false; error: string };

const TITLE_MAX = 120;
const MIGRATION_HINT =
  "Save isn’t available yet — apply migration 068_teacher_pack_flashcard_sets.";

function normalizeTitle(raw: unknown, fallback: string): string {
  const title =
    typeof raw === "string" && raw.trim()
      ? raw.trim().slice(0, TITLE_MAX)
      : fallback.trim().slice(0, TITLE_MAX);
  return title.length > 0 ? title : "Untitled flashcards";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function optionsForStorage(
  options: PackFlashcardOptions,
  seed: string,
): Record<string, unknown> {
  return {
    includeFaces: options.includeFaces,
    frontFaces: options.frontFaces,
    backFaces: options.backFaces,
    shuffle: Boolean(options.shuffle),
    seed,
  };
}

/**
 * Persist a compiled flashcard set as a teacher draft.
 * Stores frozen wordIds + compiled face snapshots (not live pack contents).
 */
export async function savePackFlashcardSet(input: {
  draft: PackFlashcardDraft;
  cards: readonly PackFlashcardCompiledCard[];
  warnings?: readonly string[];
  title?: string;
}): Promise<SavePackFlashcardSetResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) {
      return { ok: false, error: "Teacher authentication required." };
    }

    const optionsResult = validatePackFlashcardOptions(input.draft.options);
    if (!optionsResult.ok) {
      return { ok: false, error: optionsResult.errors[0] ?? "Invalid flashcard options." };
    }
    if (input.cards.length === 0) {
      return { ok: false, error: "Nothing to save — compile at least one card first." };
    }

    const pack = await getTeacherWordPack(input.draft.packId);
    if (!pack || pack.archived_at) {
      return { ok: false, error: "Word pack not found." };
    }

    const defaultTitle = `${input.draft.packTitle} · Flashcards`.slice(0, TITLE_MAX);
    const title = normalizeTitle(input.title, defaultTitle);
    const wordIds = asStringArray(input.draft.wordIds);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("teacher_pack_flashcard_sets")
      .insert({
        teacher_id: user.id,
        pack_id: input.draft.packId,
        title,
        status: "draft",
        word_ids: wordIds,
        options: optionsForStorage(optionsResult.options, input.draft.createdAt),
        cards: [...input.cards],
        warnings: [...(input.warnings ?? [])],
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(error?.message ?? "")) {
        return { ok: false, error: MIGRATION_HINT };
      }
      return { ok: false, error: error?.message ?? "Failed to save flashcards." };
    }

    revalidatePath("/teacher/word-packs");
    revalidatePath(`/teacher/word-packs/${input.draft.packId}`);

    return { ok: true, set: mapTeacherPackFlashcardSetRow(data as Record<string, unknown>) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save flashcards.";
    return { ok: false, error: message };
  }
}

export async function updatePackFlashcardSet(input: {
  setId: string;
  title?: string;
  cards?: readonly PackFlashcardCompiledCard[];
  warnings?: readonly string[];
  options?: PackFlashcardOptions;
  wordIds?: readonly string[];
}): Promise<UpdatePackFlashcardSetResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) {
      return { ok: false, error: "Teacher authentication required." };
    }

    const id = input.setId.trim();
    if (!id) return { ok: false, error: "Flashcard set id required." };

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) {
      patch.title = normalizeTitle(input.title, "Untitled flashcards");
    }
    if (input.cards !== undefined) {
      if (input.cards.length === 0) {
        return { ok: false, error: "Flashcard set must keep at least one card." };
      }
      patch.cards = [...input.cards];
    }
    if (input.warnings !== undefined) {
      patch.warnings = [...input.warnings];
    }
    if (input.wordIds !== undefined) {
      patch.word_ids = asStringArray(input.wordIds);
    }
    if (input.options !== undefined) {
      const optionsResult = validatePackFlashcardOptions(input.options);
      if (!optionsResult.ok) {
        return { ok: false, error: optionsResult.errors[0] ?? "Invalid flashcard options." };
      }
      patch.options = optionsForStorage(optionsResult.options, new Date().toISOString());
    }

    const { data, error } = await supabase
      .from("teacher_pack_flashcard_sets")
      .update(patch)
      .eq("id", id)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(error.message)) {
        return { ok: false, error: MIGRATION_HINT };
      }
      return { ok: false, error: error.message };
    }
    if (!data) return { ok: false, error: "Flashcard set not found." };

    const set = mapTeacherPackFlashcardSetRow(data as Record<string, unknown>);
    revalidatePath("/teacher/word-packs");
    if (set.pack_id) revalidatePath(`/teacher/word-packs/${set.pack_id}`);

    return { ok: true, set };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update flashcards.";
    return { ok: false, error: message };
  }
}

export async function archiveTeacherPackFlashcardSet(
  setId: string,
): Promise<SavePackFlashcardSetResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isTeacher(user)) {
      return { ok: false, error: "Teacher authentication required." };
    }

    const id = setId.trim();
    if (!id) return { ok: false, error: "Flashcard set id required." };

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("teacher_pack_flashcard_sets")
      .update({ archived_at: now, updated_at: now })
      .eq("id", id)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(error.message)) {
        return { ok: false, error: MIGRATION_HINT };
      }
      return { ok: false, error: error.message };
    }
    if (!data) return { ok: false, error: "Flashcard set not found." };

    revalidatePath("/teacher/word-packs");
    return { ok: true, set: mapTeacherPackFlashcardSetRow(data as Record<string, unknown>) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to archive flashcards.";
    return { ok: false, error: message };
  }
}

export async function archiveTeacherPackFlashcardSetFromForm(
  formData: FormData,
): Promise<void> {
  const setId = String(formData.get("set_id") ?? "");
  const result = await archiveTeacherPackFlashcardSet(setId);
  if (!result.ok) {
    redirect("/teacher/word-packs?tab=flashcards&error=flashcard_archive_failed");
  }
  redirect("/teacher/word-packs?tab=flashcards&archived_set=1");
}
