import { NextResponse } from "next/server";
import { studioCorsHeaders } from "@/lib/studio-assets/cors";
import {
  StudioAssetAuthError,
  StudioAssetValidationError,
  publishStudioAssetFromFormData,
  resolveStudioTeacherClient,
} from "@/lib/studio-assets/publish";

const MAX_BODY_BYTES = 22 * 1024 * 1024;

function json(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: studioCorsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: studioCorsHeaders(request) });
}

/**
 * EDU Studio → Lesson Player asset publish.
 * Auth: `Authorization: Bearer <supabase access token>` and/or multipart `access_token`
 * (header can be dropped by some proxies; form field is the fallback).
 * Body: multipart — `file` (required), `kind`, `meta`, optional `access_token`.
 */
export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json(request, { error: "File too large (max ~20 MB)." }, 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json(request, { error: "Expected multipart form data." }, 400);
  }

  const formTokenRaw = formData.get("access_token");
  const formAccessToken =
    typeof formTokenRaw === "string" ? formTokenRaw.trim() : "";
  if (formAccessToken) {
    formData.delete("access_token");
  }

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

  try {
    const asset = await publishStudioAssetFromFormData(
      teacher.supabase,
      teacher.user,
      formData,
    );
    return json(request, { ok: true, ...asset });
  } catch (error) {
    if (error instanceof StudioAssetValidationError) {
      return json(request, { error: error.message }, error.status);
    }
    return json(
      request,
      { error: error instanceof Error ? error.message : "Upload failed." },
      500,
    );
  }
}
