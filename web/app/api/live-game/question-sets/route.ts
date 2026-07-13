import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listPublishedQuestionSetsForHost } from "@/lib/live-game/server/question-set-list";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) {
    return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
  }

  try {
    const sets = await listPublishedQuestionSetsForHost();
    return NextResponse.json({ sets });
  } catch (error) {
    console.error("Live-game question set list failed", error);
    return NextResponse.json(
      { error: "Could not load question sets right now." },
      { status: 503 },
    );
  }
}
