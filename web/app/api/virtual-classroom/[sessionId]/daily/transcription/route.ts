import { NextResponse } from "next/server";
import { authorizeDailyMeetingToken } from "@/lib/daily/authorize-token";
import { allowDailyTokenRequest } from "@/lib/daily/rate-limit";
import {
  getOrCreateDailyRoomForSession,
  getVirtualClassroomSessionWithDaily,
} from "@/lib/daily/session-room";
import {
  createProcessingTranscriptRow,
  createTranscriptSignedUrl,
  getLatestTranscriptForSession,
  listTranscriptsForSession,
  markSessionTranscriptionEnabled,
  startDailyRoomTranscription,
  stopDailyRoomTranscription,
  vttToPlainText,
} from "@/lib/daily/transcription";
import { DailyApiError, DailyConfigError } from "@/lib/daily/types";
import { isDailyEnabled } from "@/lib/env/daily-server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { requireVirtualClassroomSessionHost } from "@/lib/virtual-classroom/server/access";

type RouteContext = { params: Promise<{ sessionId: string }> };

/** Teacher/host: latest transcript status (+ signed URL / plain text when ready). */
export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  if (!isDailyEnabled()) {
    return NextResponse.json(
      { error: "Daily video is not enabled.", code: "daily_disabled" },
      { status: 503 },
    );
  }

  const session = await getVirtualClassroomSessionWithDaily(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    await requireVirtualClassroomSessionHost(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message, code: "not_host" }, { status: 403 });
  }

  const latest = await getLatestTranscriptForSession(sessionId);
  const all = await listTranscriptsForSession(sessionId);

  let signedUrl: string | null = null;
  let plainText: string | null = null;
  if (latest?.status === "ready" && latest.storagePath) {
    signedUrl = await createTranscriptSignedUrl(latest.storagePath);
    const supabase = createServiceRoleSupabase();
    if (supabase) {
      const { data } = await supabase.storage
        .from(latest.storageBucket ?? "vc_transcripts")
        .download(latest.storagePath);
      if (data) {
        plainText = vttToPlainText(await data.text());
      }
    }
  }

  return NextResponse.json({
    sessionId,
    transcriptionEnabled: session.transcriptionEnabled,
    latest,
    transcripts: all,
    signedUrl,
    plainText,
  });
}

type Body = { action?: "start" | "stop" };

/** Host-only start/stop Daily real-time transcription (opt-in). */
export async function POST(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  if (!isDailyEnabled()) {
    return NextResponse.json(
      { error: "Daily video is not enabled.", code: "daily_disabled" },
      { status: 503 },
    );
  }

  const session = await getVirtualClassroomSessionWithDaily(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (session.status === "ended" || session.endedAt) {
    return NextResponse.json(
      { error: "Session has ended.", code: "session_ended" },
      { status: 403 },
    );
  }

  let hostUserId: string;
  try {
    const host = await requireVirtualClassroomSessionHost(session);
    hostUserId = host.userId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message, code: "not_host" }, { status: 403 });
  }

  if (!allowDailyTokenRequest(hostUserId, sessionId)) {
    return NextResponse.json(
      { error: "Too many transcription requests.", code: "rate_limited" },
      { status: 429 },
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }
  if (body.action !== "start" && body.action !== "stop") {
    return NextResponse.json(
      { error: "action must be start or stop.", code: "invalid_action" },
      { status: 400 },
    );
  }

  try {
    const room =
      session.dailyRoomName && session.dailyRoomUrl
        ? {
            name: session.dailyRoomName,
            url: session.dailyRoomUrl,
          }
        : await getOrCreateDailyRoomForSession(sessionId);

    if (!room?.name) {
      return NextResponse.json(
        { error: "Video room is not ready.", code: "room_missing" },
        { status: 404 },
      );
    }

    // Ensure caller is still an authorized host in the call sense.
    const auth = await authorizeDailyMeetingToken(session, {
      ignoreEarlyJoin: true,
    });
    if (!auth.ok || auth.role !== "teacher") {
      return NextResponse.json(
        { error: "Host video authorization required.", code: "not_host" },
        { status: 403 },
      );
    }

    if (body.action === "start") {
      await startDailyRoomTranscription({ roomName: room.name });
      await markSessionTranscriptionEnabled(sessionId, true);
      const row = await createProcessingTranscriptRow({
        sessionId,
        roomName: room.name,
      });
      return NextResponse.json({
        ok: true,
        action: "start",
        transcriptionEnabled: true,
        transcript: row,
      });
    }

    await stopDailyRoomTranscription({ roomName: room.name });
    await markSessionTranscriptionEnabled(sessionId, false);
    return NextResponse.json({
      ok: true,
      action: "stop",
      transcriptionEnabled: false,
    });
  } catch (error) {
    if (error instanceof DailyConfigError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 503 },
      );
    }
    if (error instanceof DailyApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "Transcription command failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
