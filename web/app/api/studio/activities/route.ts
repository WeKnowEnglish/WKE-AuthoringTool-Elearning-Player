import { NextResponse } from "next/server";
import { studioCorsHeaders } from "@/lib/studio-assets/cors";
import {
  StudioAssetAuthError,
  resolveStudioTeacherClient,
} from "@/lib/studio-assets/publish";
import { listStudioActivitiesForTeacher } from "@/lib/studio-activities/load";
import {
  publishStudioActivity,
  StudioActivityValidationError,
} from "@/lib/studio-activities/publish";
import type { PublishStudioActivityInput } from "@/lib/studio-activities/types";
import { isStudioActivityFormat } from "@/lib/studio-activities/validate";

/** Pack JSON should stay modest once media is on studio_media; allow headroom. */
const MAX_BODY_BYTES = 8 * 1024 * 1024;

function json(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: studioCorsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: studioCorsHeaders(request) });
}

/**
 * List the signed-in teacher's Activity Bank items.
 * Query: `?format=multiple_choice`, `?source_vocab_list_id=<uuid>`, `?limit=40` (optional).
 */
export async function GET(request: Request) {
  let teacher: Awaited<ReturnType<typeof resolveStudioTeacherClient>>;
  try {
    teacher = await resolveStudioTeacherClient(request);
  } catch (error) {
    if (error instanceof StudioAssetAuthError) {
      return json(request, { error: error.message }, error.status);
    }
    return json(
      request,
      { error: error instanceof Error ? error.message : "Authentication failed." },
      401,
    );
  }

  const url = new URL(request.url);
  const formatRaw = url.searchParams.get("format");
  const format =
    formatRaw && isStudioActivityFormat(formatRaw) ? formatRaw : undefined;
  const limitRaw = Number(url.searchParams.get("limit") || 40);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 40;
  const sourceVocabListId = url.searchParams.get("source_vocab_list_id")?.trim() || "";
  if (
    sourceVocabListId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceVocabListId)
  ) {
    return json(request, { error: "Invalid source vocabulary list id." }, 400);
  }

  try {
    const activities = await listStudioActivitiesForTeacher(
      teacher.supabase,
      teacher.user.id,
      { format, limit, vocabListId: sourceVocabListId || undefined },
    );
    return json(request, { ok: true, activities });
  } catch (error) {
    return json(
      request,
      { error: error instanceof Error ? error.message : "Could not list activities." },
      500,
    );
  }
}

/**
 * EDU Studio → Lesson Player Activity Bank publish.
 * Auth: Bearer / JSON `access_token` / cookie.
 * Body JSON: `{ format, pack, authoring?, title?, filename?, source?, id?, access_token? }`.
 * When `id` is set, updates that teacher-owned row (vocab lists / re-save).
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json(request, { error: "Activity payload too large (max ~8 MB)." }, 413);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(request, { error: "Expected JSON body." }, 400);
  }

  const formAccessToken =
    typeof body.access_token === "string" ? body.access_token.trim() : "";

  let teacher: Awaited<ReturnType<typeof resolveStudioTeacherClient>>;
  try {
    teacher = await resolveStudioTeacherClient(request, formAccessToken || null);
  } catch (error) {
    if (error instanceof StudioAssetAuthError) {
      return json(request, { error: error.message }, error.status);
    }
    return json(
      request,
      { error: error instanceof Error ? error.message : "Authentication failed." },
      401,
    );
  }

  const input: PublishStudioActivityInput = {
    id: typeof body.id === "string" ? body.id : null,
    format: body.format as PublishStudioActivityInput["format"],
    pack: body.pack,
    authoring: body.authoring,
    title: typeof body.title === "string" ? body.title : null,
    filename: typeof body.filename === "string" ? body.filename : null,
    source:
      body.source && typeof body.source === "object" && !Array.isArray(body.source)
        ? (body.source as Record<string, unknown>)
        : null,
  };

  try {
    const activity = await publishStudioActivity(
      teacher.supabase,
      teacher.user,
      input,
    );
    return json(request, { ok: true, ...activity });
  } catch (error) {
    if (error instanceof StudioActivityValidationError) {
      return json(request, { error: error.message }, error.status);
    }
    return json(
      request,
      { error: error instanceof Error ? error.message : "Publish failed." },
      500,
    );
  }
}
