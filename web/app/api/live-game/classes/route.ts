import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) {
    return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("teacher_classes")
    .select("id,title")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Could not list Live Game teacher classes", error);
    return NextResponse.json({ error: "Could not load classes." }, { status: 503 });
  }
  return NextResponse.json({ classes: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
