"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { mapTeacherLexiconRow } from "@/lib/data/teacher-lexicon";
import { mapPlatformLexiconRow } from "@/lib/data/platform-lexicon";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";
import {
  createPlatformLexiconId,
  findExistingPlatformMatchId,
  teacherEntryToPlatformDraft,
} from "@/lib/vocabulary/platform-lexicon";
import {
  createTeacherLexiconId,
  inferEntryKind,
  normalizeLexiconSurface,
} from "@/lib/vocabulary/teacher-lexicon/normalize";
import {
  canSubmitForCurriculum,
  canWithdrawCurriculumSubmission,
} from "@/lib/vocabulary/teacher-lexicon/promotion";
import type {
  TeacherLexiconEntry,
  TeacherLexiconEntryKind,
  TeacherLexiconPos,
} from "@/lib/vocabulary/teacher-lexicon/types";

export type TeacherLexiconActionResult =
  | {
      ok: true;
      entry: TeacherLexiconEntry;
      platformMatchIds?: string[];
      promotedToId?: string;
    }
  | { ok: false; error: string };

const POS_SET = new Set<string>([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "determiner",
  "preposition",
  "conjunction",
  "number",
  "interjection",
  "modal",
  "particle",
  "unspecified",
]);

const STAGE_SET = new Set([
  "PRE_A1_1",
  "PRE_A1_2",
  "A1_1",
  "A1_2",
  "A2_1",
  "A2_2",
]);

const KIND_SET = new Set<TeacherLexiconEntryKind>([
  "word",
  "phrase",
  "slang",
  "name",
  "other",
]);

async function requireTeacherUser(): Promise<{
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return user;
}

function revalidateLexiconPaths() {
  revalidatePath("/teacher/word-packs");
  revalidatePath("/teacher/dictionary/review");
}

function cleanOptionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

function cleanPos(value: unknown): TeacherLexiconPos | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const pos = value.trim();
  if (!POS_SET.has(pos)) return null;
  return pos as TeacherLexiconPos;
}

function cleanStage(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const stage = value.trim();
  return STAGE_SET.has(stage) ? stage : null;
}

function cleanKind(value: unknown, surface: string): TeacherLexiconEntryKind {
  if (typeof value === "string" && KIND_SET.has(value as TeacherLexiconEntryKind)) {
    return value as TeacherLexiconEntryKind;
  }
  return inferEntryKind(surface);
}

function findPlatformMatches(normalized: string): string[] {
  return getPrimaryVocabularySearchEntries()
    .filter((e) => e.normalizedLemma === normalized)
    .map((e) => e.id)
    .slice(0, 5);
}

function mapDb(row: Record<string, unknown>): TeacherLexiconEntry {
  return mapTeacherLexiconRow(row as Parameters<typeof mapTeacherLexiconRow>[0]);
}

export async function createTeacherLexiconEntry(input: {
  surface: string;
  entryKind?: TeacherLexiconEntryKind | null;
  pos?: string | null;
  primaryStage?: string | null;
  primaryTopic?: string | null;
  note?: string | null;
}): Promise<TeacherLexiconActionResult> {
  let teacherId: string;
  try {
    teacherId = (await requireTeacherUser()).id;
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }

  const surface = cleanOptionalText(input.surface, 80);
  if (!surface) return { ok: false, error: "Enter a word or phrase." };

  const normalized = normalizeLexiconSurface(surface);
  const entryKind = cleanKind(input.entryKind, surface);
  const pos = cleanPos(input.pos);
  const primaryStage = cleanStage(input.primaryStage);
  const primaryTopic = cleanOptionalText(input.primaryTopic, 64);
  const note = cleanOptionalText(input.note, 500);
  const id = createTeacherLexiconId();
  const platformMatchIds = findPlatformMatches(normalized);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_lexicon_entries")
    .insert({
      id,
      teacher_id: teacherId,
      surface,
      normalized,
      entry_kind: entryKind,
      pos,
      primary_stage: primaryStage,
      primary_topic: primaryTopic,
      note,
      status: "teacher_draft",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "You already have this entry in your dictionary.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateLexiconPaths();
  return {
    ok: true,
    entry: mapDb(data as Record<string, unknown>),
    platformMatchIds: platformMatchIds.length > 0 ? platformMatchIds : undefined,
  };
}

export async function updateTeacherLexiconEntry(input: {
  id: string;
  surface?: string;
  entryKind?: TeacherLexiconEntryKind | null;
  pos?: string | null;
  primaryStage?: string | null;
  primaryTopic?: string | null;
  note?: string | null;
  learnerDefinitionEn?: string | null;
  learnerMeaningVi?: string | null;
  status?: "teacher_draft" | "ready";
}): Promise<TeacherLexiconActionResult> {
  try {
    await requireTeacherUser();
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }

  if (!input.id.startsWith("tw_")) {
    return { ok: false, error: "Only your custom words can be edited." };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.surface !== undefined) {
    const surface = cleanOptionalText(input.surface, 80);
    if (!surface) return { ok: false, error: "Surface text is required." };
    patch.surface = surface;
    patch.normalized = normalizeLexiconSurface(surface);
  }
  if (input.entryKind !== undefined) {
    const surfaceForKind =
      typeof patch.surface === "string" ? patch.surface : input.surface ?? "word";
    patch.entry_kind = cleanKind(input.entryKind, String(surfaceForKind));
  }
  if (input.pos !== undefined) patch.pos = cleanPos(input.pos);
  if (input.primaryStage !== undefined) patch.primary_stage = cleanStage(input.primaryStage);
  if (input.primaryTopic !== undefined) {
    patch.primary_topic = cleanOptionalText(input.primaryTopic, 64);
  }
  if (input.note !== undefined) patch.note = cleanOptionalText(input.note, 500);
  if (input.learnerDefinitionEn !== undefined) {
    patch.learner_definition_en = cleanOptionalText(input.learnerDefinitionEn, 400);
  }
  if (input.learnerMeaningVi !== undefined) {
    patch.learner_meaning_vi = cleanOptionalText(input.learnerMeaningVi, 400);
  }
  if (input.status === "teacher_draft" || input.status === "ready") {
    patch.status = input.status;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_lexicon_entries")
    .update(patch)
    .eq("id", input.id)
    .is("archived_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That conflicts with another entry you already have." };
    }
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "Entry not found." };

  revalidateLexiconPaths();
  return { ok: true, entry: mapDb(data as Record<string, unknown>) };
}

export async function archiveTeacherLexiconEntry(id: string): Promise<TeacherLexiconActionResult> {
  try {
    await requireTeacherUser();
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }
  if (!id.startsWith("tw_")) {
    return { ok: false, error: "Only your custom words can be archived." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_lexicon_entries")
    .update({
      archived_at: new Date().toISOString(),
      status: "archived",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("archived_at", null)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Entry not found." };

  revalidateLexiconPaths();
  return { ok: true, entry: mapDb(data as Record<string, unknown>) };
}

export async function submitTeacherLexiconForCurriculum(
  id: string,
): Promise<TeacherLexiconActionResult> {
  let teacherId: string;
  try {
    teacherId = (await requireTeacherUser()).id;
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }
  if (!id.startsWith("tw_")) {
    return { ok: false, error: "Only your custom words can be submitted." };
  }

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("teacher_lexicon_entries")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .is("archived_at", null)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Entry not found." };

  const entry = mapDb(existing as Record<string, unknown>);
  if (!canSubmitForCurriculum(entry)) {
    if (entry.promotionStatus === "pending") {
      return { ok: false, error: "Already pending curriculum review." };
    }
    if (entry.promotionStatus === "approved") {
      return { ok: false, error: "Already approved by curriculum." };
    }
    if (entry.status !== "ready") {
      return { ok: false, error: "Mark Ready for class before submitting." };
    }
    if (!entry.learnerDefinitionEn?.trim()) {
      return { ok: false, error: "Add an English meaning before submitting." };
    }
    return { ok: false, error: "This entry cannot be submitted right now." };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("teacher_lexicon_entries")
    .update({
      promotion_status: "pending",
      promotion_submitted_at: now,
      promotion_reviewed_at: null,
      promotion_review_note: null,
      promotion_reviewed_by: null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Entry not found." };

  revalidateLexiconPaths();
  return { ok: true, entry: mapDb(data as Record<string, unknown>) };
}

export async function withdrawTeacherLexiconCurriculumSubmission(
  id: string,
): Promise<TeacherLexiconActionResult> {
  let teacherId: string;
  try {
    teacherId = (await requireTeacherUser()).id;
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("teacher_lexicon_entries")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) return { ok: false, error: "Entry not found." };

  const entry = mapDb(existing as Record<string, unknown>);
  if (!canWithdrawCurriculumSubmission(entry)) {
    return { ok: false, error: "Only pending submissions can be withdrawn." };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("teacher_lexicon_entries")
    .update({
      promotion_status: "none",
      promotion_submitted_at: null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Entry not found." };

  revalidateLexiconPaths();
  return { ok: true, entry: mapDb(data as Record<string, unknown>) };
}

async function reviewTeacherLexiconPromotion(input: {
  id: string;
  decision: "approved" | "returned" | "rejected";
  note?: string | null;
}): Promise<TeacherLexiconActionResult> {
  let user: Awaited<ReturnType<typeof requireTeacherUser>>;
  try {
    user = await requireTeacherUser();
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }
  if (!isAdmin(user)) {
    return { ok: false, error: "Admin access required." };
  }
  if (!input.id.startsWith("tw_")) {
    return { ok: false, error: "Invalid lexicon id." };
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return {
      ok: false,
      error: "Service role is required to review other teachers’ submissions.",
    };
  }

  const note = cleanOptionalText(input.note, 500);
  if (input.decision !== "approved" && !note) {
    return { ok: false, error: "Add a short note when returning or rejecting." };
  }

  const now = new Date().toISOString();

  if (input.decision !== "approved") {
    const { data, error } = await admin
      .from("teacher_lexicon_entries")
      .update({
        promotion_status: input.decision,
        promotion_reviewed_at: now,
        promotion_review_note: note,
        promotion_reviewed_by: user.id,
        updated_at: now,
      })
      .eq("id", input.id)
      .eq("promotion_status", "pending")
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) {
      return { ok: false, error: "Pending submission not found (it may have been withdrawn)." };
    }

    revalidateLexiconPaths();
    return { ok: true, entry: mapDb(data as Record<string, unknown>) };
  }

  // Approve → publish into platform lexicon (or link to an existing match).
  const { data: existing, error: loadError } = await admin
    .from("teacher_lexicon_entries")
    .select("*")
    .eq("id", input.id)
    .eq("promotion_status", "pending")
    .is("archived_at", null)
    .maybeSingle();

  if (loadError) return { ok: false, error: loadError.message };
  if (!existing) {
    return { ok: false, error: "Pending submission not found (it may have been withdrawn)." };
  }

  const teacherEntry = mapDb(existing as Record<string, unknown>);
  if (!teacherEntry.learnerDefinitionEn?.trim()) {
    return { ok: false, error: "Add an English meaning before approving." };
  }

  const draft = teacherEntryToPlatformDraft(teacherEntry);

  const { data: publishedRows, error: publishedError } = await admin
    .from("platform_lexicon_entries")
    .select("*")
    .eq("status", "published");

  if (publishedError) {
    return {
      ok: false,
      error:
        publishedError.message.includes("platform_lexicon_entries")
          ? "Apply migration 059_platform_lexicon_entries in Supabase, then try again."
          : publishedError.message,
    };
  }

  const published = ((publishedRows ?? []) as Parameters<typeof mapPlatformLexiconRow>[0][]).map(
    mapPlatformLexiconRow,
  );

  let promotedToId = findExistingPlatformMatchId({
    normalized: draft.normalized,
    pos: draft.pos,
    entryKind: draft.entryKind,
    staticEntries: getPrimaryVocabularySearchEntries(),
    publishedEntries: published,
  });

  if (!promotedToId) {
    promotedToId = createPlatformLexiconId();
    const { error: insertError } = await admin.from("platform_lexicon_entries").insert({
      id: promotedToId,
      lemma: draft.lemma,
      normalized: draft.normalized,
      entry_kind: draft.entryKind,
      pos: draft.pos,
      primary_stage: draft.primaryStage,
      cefr_band_candidate: draft.cefrBandCandidate,
      primary_topic: draft.primaryTopic,
      learner_definition_en: draft.learnerDefinitionEn,
      learner_meaning_vi: draft.learnerMeaningVi,
      note: draft.note,
      vocabulary_lane: "general_english",
      status: "published",
      source_teacher_entry_id: teacherEntry.id,
      promoted_by: user.id,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        // Race: another publish won unique index — re-read match.
        const { data: raced } = await admin
          .from("platform_lexicon_entries")
          .select("id")
          .eq("normalized", draft.normalized)
          .eq("pos", draft.pos)
          .eq("entry_kind", draft.entryKind)
          .eq("status", "published")
          .maybeSingle();
        if (!raced?.id) return { ok: false, error: insertError.message };
        promotedToId = raced.id as string;
      } else {
        return { ok: false, error: insertError.message };
      }
    }
  }

  const { data, error } = await admin
    .from("teacher_lexicon_entries")
    .update({
      promotion_status: "approved",
      promotion_reviewed_at: now,
      promotion_review_note: note,
      promotion_reviewed_by: user.id,
      promoted_to_id: promotedToId,
      promoted_at: now,
      updated_at: now,
    })
    .eq("id", input.id)
    .eq("promotion_status", "pending")
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    return { ok: false, error: "Pending submission not found (it may have been withdrawn)." };
  }

  revalidateLexiconPaths();
  return {
    ok: true,
    entry: mapDb(data as Record<string, unknown>),
    promotedToId,
  };
}

/** Platform admin can patch metadata on any queued entry (no in-app AI). */
export async function curriculumUpdateTeacherLexiconEntry(input: {
  id: string;
  pos?: string | null;
  primaryStage?: string | null;
  primaryTopic?: string | null;
  note?: string | null;
  learnerDefinitionEn?: string | null;
  learnerMeaningVi?: string | null;
  entryKind?: TeacherLexiconEntryKind | null;
}): Promise<TeacherLexiconActionResult> {
  let user: Awaited<ReturnType<typeof requireTeacherUser>>;
  try {
    user = await requireTeacherUser();
  } catch {
    return { ok: false, error: "Teacher authentication required." };
  }
  if (!isAdmin(user)) {
    return { ok: false, error: "Admin access required." };
  }
  if (!input.id.startsWith("tw_")) {
    return { ok: false, error: "Invalid lexicon id." };
  }

  const admin = createServiceRoleSupabase();
  if (!admin) {
    return { ok: false, error: "Service role is required for curriculum edits." };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.pos !== undefined) patch.pos = cleanPos(input.pos);
  if (input.primaryStage !== undefined) patch.primary_stage = cleanStage(input.primaryStage);
  if (input.primaryTopic !== undefined) {
    patch.primary_topic = cleanOptionalText(input.primaryTopic, 64);
  }
  if (input.note !== undefined) patch.note = cleanOptionalText(input.note, 500);
  if (input.learnerDefinitionEn !== undefined) {
    patch.learner_definition_en = cleanOptionalText(input.learnerDefinitionEn, 400);
  }
  if (input.learnerMeaningVi !== undefined) {
    patch.learner_meaning_vi = cleanOptionalText(input.learnerMeaningVi, 400);
  }
  if (input.entryKind !== undefined) {
    patch.entry_kind = cleanKind(input.entryKind, "word");
  }

  const { data, error } = await admin
    .from("teacher_lexicon_entries")
    .update(patch)
    .eq("id", input.id)
    .in("promotion_status", ["none", "pending", "returned", "rejected"])
    .is("archived_at", null)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Queued entry not found." };

  revalidateLexiconPaths();
  return { ok: true, entry: mapDb(data as Record<string, unknown>) };
}

export async function approveTeacherLexiconPromotion(
  id: string,
  note?: string | null,
): Promise<TeacherLexiconActionResult> {
  return reviewTeacherLexiconPromotion({ id, decision: "approved", note });
}

export async function returnTeacherLexiconPromotion(
  id: string,
  note: string,
): Promise<TeacherLexiconActionResult> {
  return reviewTeacherLexiconPromotion({ id, decision: "returned", note });
}

export async function rejectTeacherLexiconPromotion(
  id: string,
  note: string,
): Promise<TeacherLexiconActionResult> {
  return reviewTeacherLexiconPromotion({ id, decision: "rejected", note });
}
