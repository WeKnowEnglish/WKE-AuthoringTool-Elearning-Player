import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/auth/roles";
import {
  playPathForInboxFormat,
  putStudioPackInbox,
  type StudioPackInboxFormat,
} from "@/lib/dev/studio-pack-inbox";
import { createClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 28 * 1024 * 1024;

const FORMATS: readonly StudioPackInboxFormat[] = [
  "multiple_choice",
  "letter_mixup",
  "flashcards",
  "learning_track",
];

/**
 * Teacher same-origin pack preview handoff (works in production).
 * Body: `{ format, pack, filename? }` → `{ ok, id, playPath }`.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) {
    return NextResponse.json({ error: "Teacher sign-in required." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Pack too large for preview." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const format = body.format;
  if (typeof format !== "string" || !(FORMATS as readonly string[]).includes(format)) {
    return NextResponse.json(
      {
        error:
          'format must be "multiple_choice", "letter_mixup", "flashcards", or "learning_track".',
      },
      { status: 400 },
    );
  }
  if (body.pack == null) {
    return NextResponse.json({ error: "pack is required." }, { status: 400 });
  }

  const entry = putStudioPackInbox({
    format: format as StudioPackInboxFormat,
    pack: body.pack,
    filename: typeof body.filename === "string" ? body.filename : undefined,
  });
  const playPath = playPathForInboxFormat(entry.format, entry.id);
  return NextResponse.json({ ok: true, id: entry.id, playPath });
}
