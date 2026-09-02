import { NextResponse } from "next/server";
import { getAppRole } from "@/lib/auth/roles";
import {
  SESSION_1_SPEAKING_PROMPT_IDS,
  type Session1SpeakingPromptId,
} from "@/lib/curriculum/session-1-speaking-feedback";
import {
  Session1TranscriptionServiceError,
  transcribeSession1Speaking,
} from "@/lib/curriculum/session-1-transcription";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 1024 * 1024;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/flac",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
  "audio/x-wav",
]);
const STATION_IDS = new Set(["sports", "art", "books", "pets", "music"]);
const requestWindows = new Map<string, number[]>();

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isLocalDevelopmentRequest(request: Request) {
  if (process.env.NODE_ENV === "production") return false;
  const hostname = new URL(request.url).hostname;
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

function rateLimitKey(request: Request, userId: string | null) {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return `dev:${forwarded || "local"}`;
}

function hasRateLimitCapacity(key: string) {
  const now = Date.now();
  const recent = (requestWindows.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestWindows.set(key, recent);
    return false;
  }
  recent.push(now);
  requestWindows.set(key, recent);
  if (requestWindows.size > 500) {
    for (const [candidate, times] of requestWindows) {
      if (!times.some((time) => now - time < WINDOW_MS)) requestWindows.delete(candidate);
    }
  }
  return true;
}

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get("origin");
  if (suppliedOrigin && suppliedOrigin !== requestOrigin) {
    return json({ error: "This speaking check must start inside the lesson." }, 403);
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_AUDIO_BYTES + 64 * 1024) {
    return json({ error: "That recording is too large. Please record a shorter answer." }, 413);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getAppRole(user);
  if (!role && !isLocalDevelopmentRequest(request)) {
    return json({ error: "Please sign in to check speaking." }, 401);
  }
  if (!hasRateLimitCapacity(rateLimitKey(request, user?.id ?? null))) {
    return json({ error: "Keelan’s listening gadget needs a short rest. Try again in a minute." }, 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: "The recording could not be read." }, 400);
  }

  const audio = formData.get("audio");
  const promptValue = formData.get("promptId");
  const stationValue = formData.get("stationId");
  if (!(audio instanceof File) || audio.size < 256 || audio.size > MAX_AUDIO_BYTES) {
    return json({ error: "Please make a short recording first." }, 400);
  }
  const mimeType = audio.type.split(";", 1)[0]?.toLowerCase();
  if (!SUPPORTED_AUDIO_TYPES.has(mimeType)) {
    return json({ error: "This recording format is not supported yet." }, 415);
  }
  if (
    typeof promptValue !== "string" ||
    !SESSION_1_SPEAKING_PROMPT_IDS.includes(promptValue as Session1SpeakingPromptId)
  ) {
    return json({ error: "This speaking prompt is not available." }, 400);
  }
  const promptId = promptValue as Session1SpeakingPromptId;
  const stationId = typeof stationValue === "string" && STATION_IDS.has(stationValue)
    ? stationValue
    : null;
  if (promptId === "station-choice" && !stationId) {
    return json({ error: "Choose a station before checking your speaking." }, 400);
  }

  try {
    const feedback = await transcribeSession1Speaking({
      audio,
      promptId,
      stationId,
    });
    return json({ ok: true, feedback });
  } catch (error) {
    if (error instanceof Session1TranscriptionServiceError) {
      if (error.kind === "upstream") {
        console.warn("Session 1 transcription upstream unavailable", { status: error.status ?? null });
      }
      return json(
        { error: "Keelan’s listening gadget is resting. You can listen back and keep going." },
        error.kind === "configuration" ? 503 : 502,
      );
    }
    console.error("Session 1 transcription failed", error);
    return json({ error: "Keelan could not check that recording just now." }, 500);
  }
}
