import { NextResponse } from "next/server";
import { persistTeacherScreenPayload } from "@/lib/teacher-screen-payload";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ screenId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { screenId } = await params;
    const formData = await req.formData();
    const lessonId = String(formData.get("lesson_id") ?? "").trim();
    const moduleId = String(formData.get("module_id") ?? "").trim();
    const screenType = String(formData.get("screen_type") ?? "").trim();
    const payloadJson = String(formData.get("payload_json") ?? "");
    if (!lessonId || !moduleId || !screenType || !payloadJson) {
      return NextResponse.json(
        { error: "Missing lesson_id, module_id, screen_type, or payload_json" },
        { status: 400 },
      );
    }

    await persistTeacherScreenPayload(supabase, {
      screenId,
      lessonId,
      moduleId,
      screenType,
      payloadJson,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
