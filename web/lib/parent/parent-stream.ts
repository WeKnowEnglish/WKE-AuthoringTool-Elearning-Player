import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { requireTeacherStudentGuardianContext } from "@/lib/parent/guardian-data";
import { createClient } from "@/lib/supabase/server";

export type ParentStreamItemType =
  | "teacher_update"
  | "teacher_link"
  | "homework_update"
  | "learning_activity"
  | "student_highlight"
  | "milestone"
  | "progress_report";

export type ParentStreamItem = {
  type: ParentStreamItemType;
  sourceId: string;
  title: string;
  body: string;
  contextLabel: string | null;
  occurredAt: string;
  linkUrl: string | null;
};

export type TeacherParentStreamPublication = {
  id: string;
  kind: "student_highlight" | "milestone";
  title: string;
  body: string;
  contextLabel: string | null;
  status: "published" | "archived";
  occurredAt: string;
  publishedAt: string;
};

function normalizeStreamType(value: unknown): ParentStreamItemType {
  const allowed: ParentStreamItemType[] = [
    "teacher_update",
    "teacher_link",
    "homework_update",
    "learning_activity",
    "student_highlight",
    "milestone",
    "progress_report",
  ];
  return allowed.includes(value as ParentStreamItemType)
    ? (value as ParentStreamItemType)
    : "teacher_update";
}

export async function listParentStream(
  studentId: string,
  limit = 40,
): Promise<ParentStreamItem[]> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("parent_student_stream", {
    p_student_id: studentId,
    p_limit: Math.max(1, Math.min(limit, 100)),
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    type: normalizeStreamType(row.item_type),
    sourceId: String(row.source_id),
    title: String(row.title || "Learning update"),
    body: String(row.body || ""),
    contextLabel: row.context_label ? String(row.context_label) : null,
    occurredAt: String(row.occurred_at),
    linkUrl: row.link_url ? String(row.link_url) : null,
  }));
}

export async function listParentStreamPublicationsForTeacher(
  classId: string,
  studentId: string,
): Promise<TeacherParentStreamPublication[]> {
  noStore();
  await requireTeacherStudentGuardianContext(classId, studentId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_stream_publications")
    .select("id, kind, title, body, context_label, status, occurred_at, published_at")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    kind: row.kind === "milestone" ? "milestone" : "student_highlight",
    title: String(row.title),
    body: String(row.body || ""),
    contextLabel: row.context_label ? String(row.context_label) : null,
    status: row.status === "archived" ? "archived" : "published",
    occurredAt: String(row.occurred_at),
    publishedAt: String(row.published_at),
  }));
}
