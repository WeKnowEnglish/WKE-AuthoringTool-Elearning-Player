import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTeacher } from "@/lib/auth/roles";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import { downloadWhiteboardPreview } from "@/lib/whiteboard/server/storage-exports";

async function canAccessPreviewPath(path: string): Promise<boolean> {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user?.id) return false;

  const roundId = path.split("/")[0];
  if (!roundId) return false;

  const service = createServiceRoleSupabase();
  if (!service) {
    // Without service role, allow any authenticated user (dev fallback).
    return true;
  }

  const { data: round } = await service
    .from("whiteboard_rounds")
    .select("id, class_id, host_user_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round) return false;

  if (isTeacher(user) && round.host_user_id === user.id) return true;

  if (isTeacher(user) && round.class_id) {
    const { data: cls } = await service
      .from("teacher_classes")
      .select("id")
      .eq("id", round.class_id)
      .eq("teacher_id", user.id)
      .maybeSingle();
    if (cls) return true;
  }

  if (round.class_id) {
    const { data: enrollment } = await service
      .from("class_enrollments")
      .select("student_id")
      .eq("class_id", round.class_id)
      .eq("student_id", user.id)
      .maybeSingle();
    if (enrollment) return true;
  }

  return false;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path")?.trim();
  if (!path || path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const allowed = await canAccessPreviewPath(path);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const png = await downloadWhiteboardPreview(path);
  if (!png) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
