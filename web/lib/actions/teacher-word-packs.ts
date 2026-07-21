"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { TeacherWordPackPortal, TeacherWordPackRow } from "@/lib/data/teacher-word-packs";

export type TeacherWordPackActionResult =
  | { ok: true; pack: TeacherWordPackRow }
  | { ok: false; error: string };

const TITLE_MAX = 120;
const WORD_IDS_MAX = 200;

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
    if (out.length >= WORD_IDS_MAX) break;
  }
  return out;
}

function asNotesMap(value: unknown, wordIds: string[]): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = new Set(wordIds);
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key)) continue;
    if (typeof raw !== "string") continue;
    const note = raw.trim().slice(0, 500);
    if (note) out[key] = note;
  }
  return out;
}

function normalizeTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim().slice(0, TITLE_MAX);
  return title.length > 0 ? title : null;
}

function mapPackRow(row: Record<string, unknown>): TeacherWordPackRow {
  const wordIds = asStringArray(row.word_ids);
  return {
    id: String(row.id),
    teacher_id: String(row.teacher_id),
    title: String(row.title),
    portal: row.portal === "secondary" ? "secondary" : "primary",
    word_ids: wordIds,
    notes_by_word_id: asNotesMap(row.notes_by_word_id, wordIds),
    class_id: typeof row.class_id === "string" ? row.class_id : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    archived_at: typeof row.archived_at === "string" ? row.archived_at : null,
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

export async function createTeacherWordPack(input?: {
  title?: string;
  portal?: TeacherWordPackPortal;
  classId?: string | null;
}): Promise<void> {
  const teacherId = await requireTeacherUserId();
  const title = normalizeTitle(input?.title) ?? "Untitled word pack";
  const portal: TeacherWordPackPortal = input?.portal === "secondary" ? "secondary" : "primary";
  const classId = input?.classId?.trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_word_packs")
    .insert({
      teacher_id: teacherId,
      title,
      portal,
      word_ids: [],
      notes_by_word_id: {},
      class_id: classId,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect("/teacher/word-packs?error=create_failed");
  }

  revalidatePath("/teacher/word-packs");
  if (classId) revalidatePath(`/teacher/classes/${classId}`);
  redirect(`/teacher/word-packs/${data.id}`);
}

export async function createTeacherWordPackFromForm(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "");
  const classIdRaw = String(formData.get("class_id") ?? "").trim();
  await createTeacherWordPack({
    title,
    classId: classIdRaw || null,
  });
}

export async function saveTeacherWordPack(input: {
  packId: string;
  title: string;
  wordIds: string[];
  notesByWordId?: Record<string, string>;
  classId?: string | null;
  portal?: TeacherWordPackPortal;
}): Promise<TeacherWordPackActionResult> {
  try {
    await requireTeacherUserId();
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }

  const title = normalizeTitle(input.title);
  if (!title) return { ok: false, error: "Title is required." };

  const wordIds = asStringArray(input.wordIds);
  const notes = asNotesMap(input.notesByWordId ?? {}, wordIds);
  const portal: TeacherWordPackPortal = input.portal === "secondary" ? "secondary" : "primary";
  const classId =
    input.classId === undefined ? undefined : input.classId?.trim() ? input.classId.trim() : null;

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    title,
    portal,
    word_ids: wordIds,
    notes_by_word_id: notes,
    updated_at: new Date().toISOString(),
  };
  if (classId !== undefined) patch.class_id = classId;

  const { data, error } = await supabase
    .from("teacher_word_packs")
    .update(patch)
    .eq("id", input.packId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Pack not found." };

  const pack = mapPackRow(data as Record<string, unknown>);
  revalidatePath("/teacher/word-packs");
  revalidatePath(`/teacher/word-packs/${input.packId}`);
  if (pack.class_id) revalidatePath(`/teacher/classes/${pack.class_id}`);
  if (classId && classId !== pack.class_id) revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, pack };
}

export async function archiveTeacherWordPack(packId: string): Promise<TeacherWordPackActionResult> {
  try {
    await requireTeacherUserId();
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_word_packs")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", packId)
    .is("archived_at", null)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Pack not found." };

  const pack = mapPackRow(data as Record<string, unknown>);
  revalidatePath("/teacher/word-packs");
  revalidatePath(`/teacher/word-packs/${packId}`);
  if (pack.class_id) revalidatePath(`/teacher/classes/${pack.class_id}`);
  return { ok: true, pack };
}

/** Archive then return to the pack list (form / button action). */
export async function archiveTeacherWordPackAndRedirect(packId: string): Promise<void> {
  const result = await archiveTeacherWordPack(packId);
  if (!result.ok) {
    redirect(`/teacher/word-packs/${packId}?error=archive_failed`);
  }
  redirect("/teacher/word-packs?archived=1");
}

export async function duplicateTeacherWordPack(packId: string): Promise<void> {
  const teacherId = await requireTeacherUserId();
  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("teacher_word_packs")
    .select("*")
    .eq("id", packId)
    .is("archived_at", null)
    .maybeSingle();

  if (loadError || !existing) {
    redirect("/teacher/word-packs?error=duplicate_failed");
  }

  const source = mapPackRow(existing as Record<string, unknown>);
  const copyTitle = normalizeTitle(`${source.title} (copy)`) ?? "Untitled word pack (copy)";

  const { data, error } = await supabase
    .from("teacher_word_packs")
    .insert({
      teacher_id: teacherId,
      title: copyTitle,
      portal: source.portal,
      word_ids: source.word_ids,
      notes_by_word_id: source.notes_by_word_id,
      class_id: source.class_id,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect(`/teacher/word-packs/${packId}?error=duplicate_failed`);
  }

  revalidatePath("/teacher/word-packs");
  if (source.class_id) revalidatePath(`/teacher/classes/${source.class_id}`);
  redirect(`/teacher/word-packs/${data.id}`);
}

export async function duplicateTeacherWordPackFromForm(formData: FormData): Promise<void> {
  const packId = String(formData.get("pack_id") ?? "").trim();
  if (!packId) redirect("/teacher/word-packs?error=duplicate_failed");
  await duplicateTeacherWordPack(packId);
}

export async function archiveTeacherWordPackFromForm(formData: FormData): Promise<void> {
  const packId = String(formData.get("pack_id") ?? "").trim();
  if (!packId) redirect("/teacher/word-packs?error=archive_failed");
  await archiveTeacherWordPackAndRedirect(packId);
}
