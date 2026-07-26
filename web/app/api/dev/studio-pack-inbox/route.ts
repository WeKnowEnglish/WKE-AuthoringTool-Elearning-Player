import { NextResponse } from "next/server";
import {
  playPathForInboxFormat,
  putStudioPackInbox,
  type StudioPackInboxFormat,
} from "@/lib/dev/studio-pack-inbox";

const MAX_BODY_BYTES = 28 * 1024 * 1024;

function allowedStudioOrigins(): string[] {
  const fromEnv = process.env.STUDIO_ORIGIN?.trim() || process.env.NEXT_PUBLIC_STUDIO_ORIGIN?.trim();
  const list = [
    fromEnv,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ].filter((value): value is string => Boolean(value));
  return [...new Set(list)];
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const allowed = allowedStudioOrigins();
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return json(request, { error: "Studio pack inbox is not available in production." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json(request, { error: "Pack is too large for the inbox (max ~28 MB)." }, 413);
  }

  let rawText = "";
  try {
    rawText = await request.text();
  } catch {
    return json(request, { error: "Could not read request body." }, 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText) as unknown;
  } catch {
    const approxMb = (rawText.length / (1024 * 1024)).toFixed(1);
    const hint =
      rawText.length > 9 * 1024 * 1024
        ? ` Body looked truncated (~${approxMb} MB). Raise experimental.proxyClientMaxBodySize in Lesson Player next.config.ts and restart the LP server.`
        : "";
    return json(request, { error: `Invalid JSON body.${hint}` }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(request, { error: "Body must be an object." }, 400);
  }

  const record = body as Record<string, unknown>;
  const format = record.format;
  if (
    format !== "multiple_choice" &&
    format !== "letter_mixup" &&
    format !== "flashcards" &&
    format !== "learning_track"
  ) {
    return json(
      request,
      {
        error:
          'Supported formats: "multiple_choice", "letter_mixup", "flashcards", "learning_track".',
      },
      400,
    );
  }
  if (record.pack == null || typeof record.pack !== "object") {
    return json(request, { error: "Missing pack object." }, 400);
  }

  const filename =
    typeof record.filename === "string" && record.filename.trim()
      ? record.filename.trim()
      : undefined;

  const entry = putStudioPackInbox({
    format: format as StudioPackInboxFormat,
    pack: record.pack,
    filename,
  });

  const playPath = playPathForInboxFormat(entry.format, entry.id);
  return json(request, {
    ok: true,
    id: entry.id,
    format: entry.format,
    playPath,
    expiresInSeconds: 3600,
  });
}
