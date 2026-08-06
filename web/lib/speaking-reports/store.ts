import "server-only";

import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { VC_TRANSCRIPTS_BUCKET, vttToPlainText } from "@/lib/daily/transcription";
import { generateSpeakingReportSnapshot } from "@/lib/speaking-reports/generate";
import type { RosterStudent } from "@/lib/speaking-reports/build-draft";
import {
  speakingReportSnapshotSchema,
  speakingReportStatusSchema,
  type SpeakingReport,
  type SpeakingReportSnapshot,
  type SpeakingReportStatus,
} from "@/lib/speaking-reports/types";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

async function loadClassRosterService(classId: string): Promise<RosterStudent[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];
  const { data: enrollments } = await supabase
    .from("class_enrollments")
    .select("student_id")
    .eq("class_id", classId);
  const ids = (enrollments ?? []).map((row) => String(row.student_id));
  if (!ids.length) return [];
  const { data: profiles } = await supabase
    .from("student_profiles")
    .select("user_id, display_name")
    .in("user_id", ids);
  const nameById = new Map(
    (profiles ?? []).map((row) => [
      String(row.user_id),
      String(row.display_name || "Student"),
    ]),
  );
  return ids.map((studentId) => ({
    studentId,
    displayName: nameById.get(studentId) ?? "Student",
  }));
}

function mapReport(row: Record<string, unknown>): SpeakingReport | null {
  const status = speakingReportStatusSchema.safeParse(row.status);
  const snapshot = speakingReportSnapshotSchema.safeParse(row.snapshot);
  if (!status.success || !snapshot.success) return null;
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    classId: (row.class_id as string | null) ?? null,
    teacherId: String(row.teacher_id),
    sourceTranscriptId: (row.source_transcript_id as string | null) ?? null,
    status: status.data,
    snapshot: snapshot.data,
    generationMethod: row.generation_method === "llm" ? "llm" : "heuristic",
    generatedAt: String(row.generated_at ?? row.created_at),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    approvedAt: row.approved_at ? String(row.approved_at) : null,
    discardedAt: row.discarded_at ? String(row.discarded_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listSpeakingReportsForSession(
  sessionId: string,
): Promise<SpeakingReport[]> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("class_session_speaking_reports")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[])
    .map(mapReport)
    .filter((row): row is SpeakingReport => Boolean(row));
}

export async function getWorkingSpeakingReport(
  sessionId: string,
): Promise<SpeakingReport | null> {
  const rows = await listSpeakingReportsForSession(sessionId);
  return (
    rows.find(
      (row) => row.status === "draft" || row.status === "ready_for_review",
    ) ?? null
  );
}

export async function getLatestApprovedSpeakingReport(
  sessionId: string,
): Promise<SpeakingReport | null> {
  const rows = await listSpeakingReportsForSession(sessionId);
  return rows.find((row) => row.status === "approved") ?? null;
}

async function loadTranscriptPlainText(input: {
  storageBucket: string | null;
  storagePath: string;
}): Promise<string> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) throw new Error("Storage is not configured.");
  const { data, error } = await supabase.storage
    .from(input.storageBucket ?? VC_TRANSCRIPTS_BUCKET)
    .download(input.storagePath);
  if (error || !data) throw new Error(error?.message ?? "Could not download transcript.");
  return vttToPlainText(await data.text());
}

/**
 * Create or replace the working (draft/ready) report for a session from its latest ready transcript.
 */
export async function generateSpeakingReportForSession(input: {
  sessionId: string;
  teacherId?: string | null;
  force?: boolean;
}): Promise<SpeakingReport> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) throw new Error("Database is not configured.");

  const session = await getVirtualClassroomSessionById(input.sessionId);
  if (!session) throw new Error("Session not found.");

  let teacherId = input.teacherId?.trim() || "";
  if (!teacherId || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    teacherId = /^[0-9a-f-]{36}$/i.test(session.createdBy) ? session.createdBy : "";
  }
  if (!teacherId && session.classId) {
    const { data: cls } = await supabase
      .from("teacher_classes")
      .select("teacher_id")
      .eq("id", session.classId)
      .maybeSingle();
    teacherId = cls?.teacher_id ? String(cls.teacher_id) : "";
  }
  if (!teacherId) throw new Error("Missing teacher id for speaking report.");

  const { data: transcript } = await supabase
    .from("class_session_transcripts")
    .select("*")
    .eq("session_id", input.sessionId)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!transcript || !transcript.storage_path) {
    throw new Error("No ready transcript yet. Transcribe the class first.");
  }

  const working = await getWorkingSpeakingReport(input.sessionId);
  if (working && !input.force) {
    return working;
  }

  const plainText = await loadTranscriptPlainText({
    storageBucket: (transcript.storage_bucket as string | null) ?? null,
    storagePath: String(transcript.storage_path),
  });

  const roster = session.classId
    ? await loadClassRosterService(session.classId)
    : [];

  const { snapshot, method } = await generateSpeakingReportSnapshot({
    sessionTitle: session.title,
    classTitle: null,
    plainText,
    roster,
  });

  const now = new Date().toISOString();

  if (working) {
    const { data, error } = await supabase
      .from("class_session_speaking_reports")
      .update({
        source_transcript_id: transcript.id,
        status: "ready_for_review",
        snapshot,
        generation_method: method,
        generated_at: now,
        reviewed_at: null,
        approved_at: null,
        discarded_at: null,
        updated_at: now,
      })
      .eq("id", working.id)
      .select("*")
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Could not update report.");
    const mapped = mapReport(data as Record<string, unknown>);
    if (!mapped) throw new Error("Invalid report row.");
    return mapped;
  }

  const { data, error } = await supabase
    .from("class_session_speaking_reports")
    .insert({
      session_id: input.sessionId,
      class_id: session.classId,
      teacher_id: teacherId,
      source_transcript_id: transcript.id,
      status: "ready_for_review",
      snapshot,
      generation_method: method,
      generated_at: now,
      updated_at: now,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) throw new Error(error?.message ?? "Could not create report.");
  const mapped = mapReport(data as Record<string, unknown>);
  if (!mapped) throw new Error("Invalid report row.");
  return mapped;
}

export async function saveSpeakingReportSnapshot(input: {
  reportId: string;
  snapshot: SpeakingReportSnapshot;
}): Promise<SpeakingReport> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) throw new Error("Database is not configured.");
  const parsed = speakingReportSnapshotSchema.parse(input.snapshot);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("class_session_speaking_reports")
    .update({
      snapshot: parsed,
      status: "ready_for_review",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.reportId)
    .in("status", ["draft", "ready_for_review"])
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error(error?.message ?? "This report can no longer be edited.");
  }
  const mapped = mapReport(data as Record<string, unknown>);
  if (!mapped) throw new Error("Invalid report row.");
  return mapped;
}

export async function setSpeakingReportStatus(input: {
  reportId: string;
  status: Extract<SpeakingReportStatus, "approved" | "discarded">;
}): Promise<SpeakingReport> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) throw new Error("Database is not configured.");
  const now = new Date().toISOString();
  const patch =
    input.status === "approved"
      ? {
          status: "approved" as const,
          approved_at: now,
          reviewed_at: now,
          discarded_at: null,
          updated_at: now,
        }
      : {
          status: "discarded" as const,
          discarded_at: now,
          reviewed_at: now,
          updated_at: now,
        };

  const { data, error } = await supabase
    .from("class_session_speaking_reports")
    .update(patch)
    .eq("id", input.reportId)
    .in("status", ["draft", "ready_for_review", "approved"])
    .select("*")
    .maybeSingle();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not update report status.");
  }
  const mapped = mapReport(data as Record<string, unknown>);
  if (!mapped) throw new Error("Invalid report row.");
  return mapped;
}

/** Best-effort auto draft after transcript webhook — never throws to caller. */
export async function tryAutoGenerateSpeakingReport(
  sessionId: string,
): Promise<void> {
  try {
    await generateSpeakingReportForSession({ sessionId, force: false });
  } catch {
    // Ignore: teacher can generate manually.
  }
}
