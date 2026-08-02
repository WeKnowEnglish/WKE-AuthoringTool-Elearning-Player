"use server";

import { revalidatePath } from "next/cache";
import { requireTeacherStudentGuardianContext } from "@/lib/parent/guardian-data";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true; message: string } | { ok: false; error: string };

function revalidateParentSharing(classId: string, studentId: string) {
  revalidatePath(`/teacher/classes/${classId}/students/${studentId}`);
  revalidatePath(`/parent/students/${studentId}/stream`);
}

export async function publishParentStreamItem(input: {
  classId: string;
  studentId: string;
  kind: string;
  title: string;
  body: string;
  contextLabel?: string;
  occurredAt?: string;
}): Promise<Result> {
  try {
    const context = await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const kind = input.kind === "milestone" ? "milestone" : "student_highlight";
    const title = input.title.trim().slice(0, 200);
    const body = input.body.trim().slice(0, 2000);
    const contextLabel = input.contextLabel?.trim().slice(0, 160) || null;
    if (!title) return { ok: false, error: "Add a short title." };
    if (!body) return { ok: false, error: "Explain what the student did or learned." };

    let occurredAt = new Date().toISOString();
    if (input.occurredAt) {
      const parsed = new Date(input.occurredAt);
      if (Number.isFinite(parsed.getTime())) occurredAt = parsed.toISOString();
    }

    const supabase = await createClient();
    const { error } = await supabase.from("parent_stream_publications").insert({
      student_id: context.student.id,
      class_id: context.teacherClass.id,
      teacher_id: context.user.id,
      kind,
      title,
      body,
      context_label: contextLabel,
      status: "published",
      occurred_at: occurredAt,
    });
    if (error) return { ok: false, error: error.message };
    revalidateParentSharing(input.classId, input.studentId);
    return { ok: true, message: "Published to the parent stream." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not publish the update.",
    };
  }
}

export async function archiveParentStreamItem(input: {
  classId: string;
  studentId: string;
  publicationId: string;
}): Promise<Result> {
  try {
    const context = await requireTeacherStudentGuardianContext(input.classId, input.studentId);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("parent_stream_publications")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.publicationId)
      .eq("student_id", context.student.id)
      .eq("class_id", context.teacherClass.id)
      .eq("teacher_id", context.user.id)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Published update not found." };
    revalidateParentSharing(input.classId, input.studentId);
    return { ok: true, message: "Update archived." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not archive the update.",
    };
  }
}
