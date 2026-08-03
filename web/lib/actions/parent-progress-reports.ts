"use server";

import { revalidatePath } from "next/cache";
import { getStudentDiagnosticBundle } from "@/lib/data/teacher-mastery";
import { deliverParentNotificationEmails } from "@/lib/email/parent-notifications";
import { requireTeacherStudentGuardianContext } from "@/lib/parent/guardian-data";
import {
  buildParentProgressDraft,
  parentProgressSnapshotSchema,
  type ParentProgressSnapshot,
} from "@/lib/parent/progress-report";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string } | { ok: false; error: string };

function revalidateProgress(classId: string, studentId: string) {
  revalidatePath(`/teacher/classes/${classId}/students/${studentId}`);
  revalidatePath(`/parent/students/${studentId}/progress`);
  revalidatePath(`/parent/students/${studentId}/stream`);
}

function rpcResult(data: unknown): { ok: boolean; error?: string } {
  if (!data || typeof data !== "object") return { ok: false, error: "Unexpected response." };
  const result = data as Record<string, unknown>;
  return { ok: result.ok === true, error: result.error ? String(result.error) : undefined };
}

export async function generateParentProgressDraft(input: {
  classId: string;
  studentId: string;
}): Promise<Result> {
  try {
    const context = await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const bundle = await getStudentDiagnosticBundle(input.classId, input.studentId);
    if (!bundle) return { ok: false, error: "Student learning information was not found." };
    const draft = buildParentProgressDraft({
      studentName: context.student.displayName,
      classTitle: context.teacherClass.title,
      records: bundle.records,
      strands: bundle.strands,
      vocabularyRows: bundle.vocabularyRows,
      grammarRows: bundle.grammarRows,
    });

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_parent_progress_report", {
      p_student_id: context.student.id,
      p_class_id: context.teacherClass.id,
      p_period_start: draft.periodStart,
      p_period_end: draft.periodEnd,
      p_snapshot: draft.snapshot,
    });
    if (error) return { ok: false, error: error.message };
    const result = rpcResult(data);
    if (!result.ok) return { ok: false, error: result.error ?? "Could not create the draft." };
    revalidateProgress(input.classId, input.studentId);
    return { ok: true, message: "Draft created from current saved learning evidence." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create the draft.",
    };
  }
}

export async function saveParentProgressDraft(input: {
  classId: string;
  studentId: string;
  reportId: string;
  snapshot: ParentProgressSnapshot;
}): Promise<Result> {
  try {
    await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const parsed = parentProgressSnapshotSchema.safeParse(input.snapshot);
    if (!parsed.success) {
      return { ok: false, error: "Complete every parent-facing report field before saving." };
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_parent_progress_report", {
      p_report_id: input.reportId,
      p_snapshot: parsed.data,
    });
    if (error) return { ok: false, error: error.message };
    const result = rpcResult(data);
    if (!result.ok) {
      return { ok: false, error: result.error ?? "This report can no longer be edited." };
    }
    revalidateProgress(input.classId, input.studentId);
    return { ok: true, message: "Draft saved and ready for final review." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the report.",
    };
  }
}

export async function publishParentProgressReport(input: {
  classId: string;
  studentId: string;
  reportId: string;
}): Promise<Result> {
  try {
    await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("publish_parent_progress_report", {
      p_report_id: input.reportId,
    });
    if (error) return { ok: false, error: error.message };
    const result = rpcResult(data);
    if (!result.ok) return { ok: false, error: result.error ?? "Could not publish the report." };
    await supabase.rpc("create_report_published_notifications", {
      p_report_id: input.reportId,
    });
    await deliverParentNotificationEmails({
      sourceId: input.reportId,
      type: "report_published",
    }).catch(() => undefined);
    revalidateProgress(input.classId, input.studentId);
    return { ok: true, message: "Progress report published to linked guardians." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not publish the report.",
    };
  }
}

export async function archiveParentProgressReport(input: {
  classId: string;
  studentId: string;
  reportId: string;
}): Promise<Result> {
  try {
    await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("archive_parent_progress_report", {
      p_report_id: input.reportId,
    });
    if (error) return { ok: false, error: error.message };
    const result = rpcResult(data);
    if (!result.ok) return { ok: false, error: result.error ?? "Could not archive the report." };
    revalidateProgress(input.classId, input.studentId);
    return { ok: true, message: "Progress report archived." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not archive the report.",
    };
  }
}
