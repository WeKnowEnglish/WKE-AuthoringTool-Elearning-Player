import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type TeacherWordPackPortal = "primary" | "secondary";

export type TeacherWordPackRow = {
  id: string;
  teacher_id: string;
  title: string;
  portal: TeacherWordPackPortal;
  word_ids: string[];
  notes_by_word_id: Record<string, string>;
  class_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type TeacherWordPackSummary = {
  id: string;
  title: string;
  portal: TeacherWordPackPortal;
  wordCount: number;
  /** Included so quiz drafts can freeze ids without a second fetch. */
  wordIds: string[];
  class_id: string | null;
  updated_at: string;
  archived_at: string | null;
};

type DbWordPackRow = {
  id: string;
  teacher_id: string;
  title: string;
  portal: string;
  word_ids: unknown;
  notes_by_word_id: unknown;
  class_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asNotesMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw;
  }
  return out;
}

function mapRow(row: DbWordPackRow): TeacherWordPackRow {
  return {
    id: row.id,
    teacher_id: row.teacher_id,
    title: row.title,
    portal: row.portal === "secondary" ? "secondary" : "primary",
    word_ids: asStringArray(row.word_ids),
    notes_by_word_id: asNotesMap(row.notes_by_word_id),
    class_id: row.class_id,
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

export const listTeacherWordPacks = cache(async function listTeacherWordPacks(options?: {
  includeArchived?: boolean;
}): Promise<TeacherWordPackSummary[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  let query = supabase
    .from("teacher_word_packs")
    .select("id, title, portal, word_ids, class_id, updated_at, archived_at")
    .order("updated_at", { ascending: false });

  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as Pick<
    DbWordPackRow,
    "id" | "title" | "portal" | "word_ids" | "class_id" | "updated_at" | "archived_at"
  >[]).map((row) => {
    const wordIds = asStringArray(row.word_ids);
    return {
      id: row.id,
      title: row.title,
      portal: row.portal === "secondary" ? "secondary" : "primary",
      wordCount: wordIds.length,
      wordIds,
      class_id: row.class_id,
      updated_at: row.updated_at,
      archived_at: row.archived_at,
    };
  });
});

export const getTeacherWordPack = cache(async function getTeacherWordPack(
  packId: string,
): Promise<TeacherWordPackRow | null> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_word_packs")
    .select("*")
    .eq("id", packId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as DbWordPackRow);
});

export const listTeacherWordPacksForClass = cache(async function listTeacherWordPacksForClass(
  classId: string,
): Promise<TeacherWordPackSummary[]> {
  noStore();
  await requireTeacherUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teacher_word_packs")
    .select("id, title, portal, word_ids, class_id, updated_at, archived_at")
    .eq("class_id", classId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Pick<
    DbWordPackRow,
    "id" | "title" | "portal" | "word_ids" | "class_id" | "updated_at" | "archived_at"
  >[]).map((row) => {
    const wordIds = asStringArray(row.word_ids);
    return {
      id: row.id,
      title: row.title,
      portal: row.portal === "secondary" ? "secondary" : "primary",
      wordCount: wordIds.length,
      wordIds,
      class_id: row.class_id,
      updated_at: row.updated_at,
      archived_at: row.archived_at,
    };
  });
});
