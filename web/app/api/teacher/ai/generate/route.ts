import { NextResponse } from "next/server";
import { generateLessonDrafts } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";
import { rateLimitAllow } from "@/lib/rate-limit/memory";

const AI_WINDOW_MS = 60 * 60 * 1000;
const AI_MAX_PER_WINDOW = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "teacher") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !rateLimitAllow(`ai:${user.id}`, AI_MAX_PER_WINDOW, AI_WINDOW_MS)
  ) {
    return NextResponse.json(
      { error: "Too many AI requests. Try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const gradeBand = String(body.gradeBand ?? "3-5").trim();
    const goal = String(body.goal ?? "").trim();
    const vocabulary = String(body.vocabulary ?? "").trim();
    const premise = String(body.premise ?? "").trim();
    if (!title || !goal || !premise) {
      return NextResponse.json(
        { error: "title, goal, and premise are required" },
        { status: 400 },
      );
    }
    const screens = await generateLessonDrafts({
      title,
      gradeBand,
      goal,
      vocabulary,
      premise,
    });
    return NextResponse.json({ screens });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
