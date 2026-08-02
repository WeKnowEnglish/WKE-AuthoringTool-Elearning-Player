import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { requireTeacherStudentGuardianContext } from "@/lib/parent/guardian-data";
import {
  parseParentProgressSnapshot,
  type ParentProgressReport,
  type ParentProgressReportStatus,
} from "@/lib/parent/progress-report";
import { createClient } from "@/lib/supabase/server";

function normalizeStatus(value: unknown): ParentProgressReportStatus {
  if (
    value === "draft" ||
    value === "ready_for_review" ||
    value === "published" ||
    value === "archived"
  ) {
    return value;
  }
  return "archived";
}

function mapReport(row: Record<string, unknown>): ParentProgressReport | null {
  const snapshot = parseParentProgressSnapshot(row.snapshot);
  if (!snapshot) return null;
  return {
    id: String(row.id ?? row.report_id),
    studentId: String(row.student_id ?? ""),
    classId: String(row.class_id ?? ""),
    version: Number(row.version) || 1,
    status: normalizeStatus(row.status ?? "published"),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    snapshot,
    generatedAt: String(row.generated_at ?? row.published_at ?? ""),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
  };
}

export async function listProgressReportsForTeacher(
  classId: string,
  studentId: string,
): Promise<ParentProgressReport[]> {
  noStore();
  await requireTeacherStudentGuardianContext(classId, studentId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_progress_reports")
    .select(
      "id, student_id, class_id, version, status, period_start, period_end, snapshot, generated_at, reviewed_at, published_at, archived_at",
    )
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .order("version", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => mapReport(row as Record<string, unknown>))
    .filter((report): report is ParentProgressReport => report !== null);
}

export async function getParentPublishedProgressReport(
  studentId: string,
): Promise<ParentProgressReport | null> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("parent_published_progress_report", {
    p_student_id: studentId,
  });
  if (error) throw error;
  const row = ((data ?? []) as Array<Record<string, unknown>>)[0];
  if (!row) return null;
  const report = mapReport(row);
  return report ? { ...report, studentId, status: "published" } : null;
}
