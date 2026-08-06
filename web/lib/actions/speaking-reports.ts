"use server";

import { revalidatePath } from "next/cache";
import {
  speakingReportSnapshotSchema,
  type SpeakingReportSnapshot,
} from "@/lib/speaking-reports/types";
import {
  generateSpeakingReportForSession,
  getLatestApprovedSpeakingReport,
  getWorkingSpeakingReport,
  listSpeakingReportsForSession,
  saveSpeakingReportSnapshot,
  setSpeakingReportStatus,
} from "@/lib/speaking-reports/store";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

type Result<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; error: string };

async function requireHost(sessionId: string) {
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) throw new Error("Session not found.");
  const host = await requireVirtualClassroomSessionHost(session);
  return { session, host };
}

function revalidateSession(sessionId: string, classId: string | null) {
  revalidatePath(`/teacher/virtual-classroom/${sessionId}/transcript`);
  revalidatePath(`/teacher/virtual-classroom/${sessionId}`);
  if (classId) revalidatePath(`/teacher/classes/${classId}`);
}

export async function loadSpeakingReportsAction(sessionId: string): Promise<
  Result<{
    working: Awaited<ReturnType<typeof getWorkingSpeakingReport>>;
    approved: Awaited<ReturnType<typeof getLatestApprovedSpeakingReport>>;
    history: Awaited<ReturnType<typeof listSpeakingReportsForSession>>;
  }>
> {
  try {
    await requireHost(sessionId);
    const [working, approved, history] = await Promise.all([
      getWorkingSpeakingReport(sessionId),
      getLatestApprovedSpeakingReport(sessionId),
      listSpeakingReportsForSession(sessionId),
    ]);
    return {
      ok: true,
      message: "Loaded",
      data: { working, approved, history },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not load reports.",
    };
  }
}

export async function generateSpeakingReportAction(input: {
  sessionId: string;
  force?: boolean;
}): Promise<Result<{ reportId: string }>> {
  try {
    const { session, host } = await requireHost(input.sessionId);
    const report = await generateSpeakingReportForSession({
      sessionId: input.sessionId,
      teacherId: host.userId,
      force: input.force ?? true,
    });
    revalidateSession(input.sessionId, session.classId);
    return {
      ok: true,
      message: "Speaking report draft ready for review.",
      data: { reportId: report.id },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not generate the report.",
    };
  }
}

export async function saveSpeakingReportAction(input: {
  sessionId: string;
  reportId: string;
  snapshot: SpeakingReportSnapshot;
}): Promise<Result> {
  try {
    const { session } = await requireHost(input.sessionId);
    const parsed = speakingReportSnapshotSchema.safeParse(input.snapshot);
    if (!parsed.success) {
      return { ok: false, error: "Complete required report fields before saving." };
    }
    await saveSpeakingReportSnapshot({
      reportId: input.reportId,
      snapshot: parsed.data,
    });
    revalidateSession(input.sessionId, session.classId);
    return { ok: true, message: "Draft saved." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save the report.",
    };
  }
}

export async function approveSpeakingReportAction(input: {
  sessionId: string;
  reportId: string;
}): Promise<Result> {
  try {
    const { session } = await requireHost(input.sessionId);
    await setSpeakingReportStatus({
      reportId: input.reportId,
      status: "approved",
    });
    revalidateSession(input.sessionId, session.classId);
    return {
      ok: true,
      message: "Report approved. It is saved for this session (teacher-only).",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not approve the report.",
    };
  }
}

export async function discardSpeakingReportAction(input: {
  sessionId: string;
  reportId: string;
}): Promise<Result> {
  try {
    const { session } = await requireHost(input.sessionId);
    await setSpeakingReportStatus({
      reportId: input.reportId,
      status: "discarded",
    });
    revalidateSession(input.sessionId, session.classId);
    return { ok: true, message: "Draft discarded." };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not discard the report.",
    };
  }
}
