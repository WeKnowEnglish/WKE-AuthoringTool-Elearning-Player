import { NextResponse } from "next/server";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

const BUCKET = "homework_media";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  if (!UUID_RE.test(mediaId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Not found", { status: 404 });

  const admin = createServiceRoleSupabase();
  if (!admin) return new NextResponse("Not found", { status: 404 });

  const { data: media, error } = await admin
    .from("homework_collection_media")
    .select("storage_path,content_type,student_id,homework_id")
    .eq("id", mediaId)
    .maybeSingle();
  if (error || !media) return new NextResponse("Not found", { status: 404 });

  const studentId = String(media.student_id);
  const homeworkId = String(media.homework_id);
  const ownsMedia = isStudent(user) && studentId === user.id;
  let teacherOwnsHomework = false;
  if (!ownsMedia && isTeacher(user)) {
    const { data: homework } = await admin
      .from("class_homework")
      .select("teacher_id,class_id")
      .eq("id", homeworkId)
      .maybeSingle();
    if (homework) {
      if (String(homework.teacher_id) === user.id) {
        teacherOwnsHomework = true;
      } else {
        const { data: teacherClass } = await admin
          .from("teacher_classes")
          .select("teacher_id")
          .eq("id", homework.class_id)
          .maybeSingle();
        teacherOwnsHomework = String(teacherClass?.teacher_id) === user.id;
      }
    }
  }
  if (!ownsMedia && !teacherOwnsHomework) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data, error: downloadError } = await admin.storage
    .from(BUCKET)
    .download(String(media.storage_path));
  if (downloadError || !data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": String(media.content_type || "image/png"),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
