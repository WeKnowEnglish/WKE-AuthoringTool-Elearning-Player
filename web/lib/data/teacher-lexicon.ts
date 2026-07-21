import { unstable_noStore as noStore } from "next/cache";
import { cache } from "react";
import { isAdmin, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type {
  TeacherLexiconEntry,
  TeacherLexiconEntryKind,
  TeacherLexiconPos,
  TeacherLexiconPromotionStatus,
  TeacherLexiconStatus,
} from "@/lib/vocabulary/teacher-lexicon/types";

type DbRow = {
  id: string;
  teacher_id: string;
  surface: string;
  normalized: string;
  entry_kind: string;
  pos: string | null;
  primary_stage: string | null;
  primary_topic: string | null;
  note: string | null;
  learner_definition_en: string | null;
  learner_meaning_vi: string | null;
  status: string;
  promotion_status?: string | null;
  promotion_submitted_at?: string | null;
  promotion_reviewed_at?: string | null;
  promotion_review_note?: string | null;
  promotion_reviewed_by?: string | null;
  promoted_to_id?: string | null;
  promoted_at?: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function mapKind(value: string): TeacherLexiconEntryKind {
  if (value === "phrase" || value === "slang" || value === "name" || value === "other") {
    return value;
  }
  return "word";
}

function mapStatus(value: string): TeacherLexiconStatus {
  if (value === "ready" || value === "archived") return value;
  return "teacher_draft";
}

function mapPromotionStatus(value: string | null | undefined): TeacherLexiconPromotionStatus {
  if (
    value === "pending" ||
    value === "returned" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value;
  }
  return "none";
}

function mapPos(value: string | null): TeacherLexiconPos | null {
  if (!value) return null;
  return value as TeacherLexiconPos;
}

export function mapTeacherLexiconRow(row: DbRow): TeacherLexiconEntry {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    surface: row.surface,
    normalized: row.normalized,
    entryKind: mapKind(row.entry_kind),
    pos: mapPos(row.pos),
    primaryStage: row.primary_stage,
    primaryTopic: row.primary_topic,
    note: row.note,
    learnerDefinitionEn: row.learner_definition_en,
    learnerMeaningVi: row.learner_meaning_vi,
    status: mapStatus(row.status),
    promotionStatus: mapPromotionStatus(row.promotion_status),
    promotionSubmittedAt: row.promotion_submitted_at ?? null,
    promotionReviewedAt: row.promotion_reviewed_at ?? null,
    promotionReviewNote: row.promotion_review_note ?? null,
    promotionReviewedBy: row.promotion_reviewed_by ?? null,
    promotedToId: row.promoted_to_id ?? null,
    promotedAt: row.promoted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

async function requireTeacherUser(): Promise<{ id: string; email?: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return { id: user.id, email: user.email };
}

export const listTeacherLexiconEntries = cache(async function listTeacherLexiconEntries(options?: {
  includeArchived?: boolean;
}): Promise<TeacherLexiconEntry[]> {
  noStore();
  await requireTeacherUser();
  const supabase = await createClient();

  let query = supabase
    .from("teacher_lexicon_entries")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapTeacherLexiconRow);
});

export const getTeacherLexiconEntry = cache(async function getTeacherLexiconEntry(
  id: string,
): Promise<TeacherLexiconEntry | null> {
  noStore();
  await requireTeacherUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_lexicon_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapTeacherLexiconRow(data as DbRow);
});

export async function getTeacherLexiconEntriesByIds(
  ids: readonly string[],
): Promise<TeacherLexiconEntry[]> {
  noStore();
  const twIds = ids.filter((id) => id.startsWith("tw_"));
  if (twIds.length === 0) return [];
  await requireTeacherUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("teacher_lexicon_entries").select("*").in("id", twIds);
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapTeacherLexiconRow);
}

/**
 * Admin lexicon review tabs (D5).
 * - added: in a teacher's dictionary, not pending and not approved
 * - submitted: pending curriculum review
 * - approved: published / accepted
 */
export type LexiconReviewTab = "added" | "submitted" | "approved";

export const listLexiconReviewBucket = cache(async function listLexiconReviewBucket(
  tab: LexiconReviewTab,
): Promise<{ entries: TeacherLexiconEntry[]; canReviewAll: boolean }> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  const canReviewAll = isAdmin(user);

  const statuses: TeacherLexiconPromotionStatus[] =
    tab === "added"
      ? ["none", "returned", "rejected"]
      : tab === "submitted"
        ? ["pending"]
        : ["approved"];

  if (canReviewAll) {
    const admin = createServiceRoleSupabase();
    if (!admin) {
      const own = await listOwnByPromotionStatuses(statuses, tab);
      return { entries: own, canReviewAll: false };
    }
    let query = admin
      .from("teacher_lexicon_entries")
      .select("*")
      .is("archived_at", null)
      .in("promotion_status", statuses);

    if (tab === "submitted") {
      query = query.order("promotion_submitted_at", { ascending: true, nullsFirst: false });
    } else if (tab === "approved") {
      query = query.order("promoted_at", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("updated_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return { entries: ((data ?? []) as DbRow[]).map(mapTeacherLexiconRow), canReviewAll: true };
  }

  // Non-admins: own rows only (added = their drafts; submitted/approved = their queue history).
  const own = await listOwnByPromotionStatuses(statuses, tab);
  return { entries: own, canReviewAll: false };
});

async function listOwnByPromotionStatuses(
  statuses: TeacherLexiconPromotionStatus[],
  tab: LexiconReviewTab,
): Promise<TeacherLexiconEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("teacher_lexicon_entries")
    .select("*")
    .is("archived_at", null)
    .in("promotion_status", statuses);

  if (tab === "submitted") {
    query = query.order("promotion_submitted_at", { ascending: false, nullsFirst: false });
  } else if (tab === "approved") {
    query = query.order("promoted_at", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapTeacherLexiconRow);
}

/**
 * @deprecated Prefer listLexiconReviewBucket — kept for call sites that want open queue.
 */
export const listLexiconPromotionQueue = cache(async function listLexiconPromotionQueue(options?: {
  status?: TeacherLexiconPromotionStatus | "open";
}): Promise<{ entries: TeacherLexiconEntry[]; canReviewAll: boolean }> {
  const statusFilter = options?.status ?? "open";
  if (statusFilter === "open" || statusFilter === "pending") {
    return listLexiconReviewBucket("submitted");
  }
  if (statusFilter === "approved") {
    return listLexiconReviewBucket("approved");
  }
  if (statusFilter === "returned" || statusFilter === "rejected" || statusFilter === "none") {
    return listLexiconReviewBucket("added");
  }
  return listLexiconReviewBucket("submitted");
});
