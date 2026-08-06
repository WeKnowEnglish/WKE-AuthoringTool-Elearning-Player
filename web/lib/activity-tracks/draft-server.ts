import { parseActivityTrackDocument } from "@/lib/activity-tracks/parse-document";
import type { ActivityTrackDocument } from "@/lib/activity-tracks/types";
import { createClient } from "@/lib/supabase/server";

type DraftRow = {
  id: string;
  teacher_id: string;
  mode: string;
  title: string;
  document: unknown;
  created_at: string;
  updated_at: string;
};

function rowToDocument(row: Pick<DraftRow, "document">): ActivityTrackDocument | null {
  return parseActivityTrackDocument(row.document);
}

export async function listActivityTrackDraftsForTeacher(
  teacherId: string,
): Promise<ActivityTrackDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_track_drafts")
    .select("document")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(rowToDocument)
    .filter((doc): doc is ActivityTrackDocument => Boolean(doc));
}

export async function getActivityTrackDraftForTeacher(
  teacherId: string,
  id: string,
): Promise<ActivityTrackDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_track_drafts")
    .select("document")
    .eq("teacher_id", teacherId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToDocument(data);
}

export async function upsertActivityTrackDraft(
  teacherId: string,
  doc: ActivityTrackDocument,
): Promise<ActivityTrackDocument> {
  const supabase = await createClient();
  const { error } = await supabase.from("activity_track_drafts").upsert(
    {
      id: doc.id,
      teacher_id: teacherId,
      mode: doc.mode,
      title: doc.title.trim(),
      document: doc,
      updated_at: doc.updatedAt,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
  return doc;
}

export async function deleteActivityTrackDraftForTeacher(
  teacherId: string,
  id: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_track_drafts")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
