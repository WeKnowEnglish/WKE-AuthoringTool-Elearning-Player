import { NextResponse } from "next/server";
import { studioCorsHeaders } from "@/lib/studio-assets/cors";
import {
  StudioAssetAuthError,
  resolveStudioTeacherClient,
} from "@/lib/studio-assets/publish";
import { getStudioActivityForTeacher } from "@/lib/studio-activities/load";

type Params = { params: Promise<{ id: string }> };

function json(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: studioCorsHeaders(request) });
}

async function resolveTeacher(request: Request) {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("access_token")?.trim() || "";
  return resolveStudioTeacherClient(request, queryToken || null);
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: studioCorsHeaders(request) });
}

/**
 * Load one Activity Bank pack for the signed-in teacher (pilot `?activity=`).
 * Auth: Bearer or cookie teacher session.
 */
export async function GET(request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return json(request, { error: "Missing activity id." }, 400);
  }

  let teacher: Awaited<ReturnType<typeof resolveStudioTeacherClient>>;
  try {
    teacher = await resolveTeacher(request);
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
    const activity = await getStudioActivityForTeacher(
      teacher.supabase,
      teacher.user.id,
      id,
    );
    if (!activity) {
      return json(
        request,
        { error: "Activity not found. It may belong to another teacher or was deleted." },
        404,
      );
    }
    return json(request, { ok: true, ...activity });
  } catch (error) {
    return json(
      request,
      { error: error instanceof Error ? error.message : "Could not load activity." },
      500,
    );
  }
}

/** Delete one of the signed-in teacher's Activity Bank rows. */
export async function DELETE(request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return json(request, { error: "Missing activity id." }, 400);
  }

  let teacher: Awaited<ReturnType<typeof resolveStudioTeacherClient>>;
  try {
    teacher = await resolveTeacher(request);
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

  const { error } = await teacher.supabase
    .from("studio_activities")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacher.user.id);

  if (error) {
    return json(request, { error: error.message }, 500);
  }
  return json(request, { ok: true, id });
}
