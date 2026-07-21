import "server-only";

import {
  freezePackFlashcardsPayload,
  parseStoredPackFlashcardCards,
} from "@/lib/class-homework/freeze-pack-flashcards";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import { listTeacherPackFlashcardSetsForClass } from "@/lib/data/class-homework";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type {
  AssignableActivityAdapter,
  AssignableActivityCard,
} from "@/lib/assignable-activities/types";
import { sourceLabelForAssignableKind } from "@/lib/assignable-activities/map";
import {
  normalizePackFlashcardOptions,
  type PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";

const SOURCE_LABEL = sourceLabelForAssignableKind("pack_flashcards");

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

function optionsFromStored(raw: unknown): PackFlashcardOptions | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  try {
    return normalizePackFlashcardOptions({
      includeFaces: Array.isArray(row.includeFaces)
        ? (row.includeFaces as PackFlashcardOptions["includeFaces"])
        : [],
      frontFaces: Array.isArray(row.frontFaces)
        ? (row.frontFaces as PackFlashcardOptions["frontFaces"])
        : [],
      backFaces: Array.isArray(row.backFaces)
        ? (row.backFaces as PackFlashcardOptions["backFaces"])
        : [],
      shuffle: Boolean(row.shuffle),
    });
  } catch {
    return null;
  }
}

export const packFlashcardsAdapter: AssignableActivityAdapter = {
  kind: "pack_flashcards",
  label: SOURCE_LABEL,
  studentRenderer: "pack_flashcards",

  async listForClass(classId: string): Promise<AssignableActivityCard[]> {
    const sets = await listTeacherPackFlashcardSetsForClass(classId);
    if (!sets.length) return [];

    const packIds = [
      ...new Set(sets.map((set) => set.packId).filter((id): id is string => Boolean(id))),
    ];
    const packTitleById = new Map<string, string>();

    if (packIds.length > 0) {
      const supabase = await createClient();
      await requireTeacherUserId();
      const { data: packs } = await supabase
        .from("teacher_word_packs")
        .select("id, title")
        .in("id", packIds)
        .is("archived_at", null);
      for (const row of packs ?? []) {
        packTitleById.set(String((row as { id: string }).id), String((row as { title: string }).title));
      }
    }

    return sets.map((set) => {
      const packTitle = set.packId ? packTitleById.get(set.packId) : undefined;
      const ready = set.cardCount > 0;
      return {
        kind: "pack_flashcards" as const,
        artifactId: set.id,
        title: set.title,
        subtitle: packTitle ? `from ${packTitle}` : undefined,
        questionCount: set.cardCount,
        ready,
        sourceLabel: SOURCE_LABEL,
        packId: set.packId,
      };
    });
  },

  async toHomeworkPayload(artifactId: string): Promise<ClassHomeworkPayload> {
    const teacherId = await requireTeacherUserId();
    const setId = artifactId.trim();
    if (!setId) {
      throw new Error("Missing flashcard set.");
    }

    const supabase = await createClient();
    const { data: set, error } = await supabase
      .from("teacher_pack_flashcard_sets")
      .select("id, title, cards, options, archived_at")
      .eq("id", setId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (error) {
      if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(error.message)) {
        throw new Error(
          "Flashcards aren’t available yet — apply migration 068_teacher_pack_flashcard_sets.",
        );
      }
      throw new Error(error.message);
    }
    if (!set || set.archived_at) {
      throw new Error("Flashcard set not found.");
    }

    const cards = parseStoredPackFlashcardCards(set.cards);
    if (cards.length < 1) {
      throw new Error("Flashcard set has no cards.");
    }

    return freezePackFlashcardsPayload({
      setId,
      setTitle: String(set.title ?? "Flashcards"),
      cards,
      options: optionsFromStored(set.options),
    });
  },
};
