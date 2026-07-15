import { NextResponse } from "next/server";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listPublishedQuestionSetsForHostWithMeta } from "@/lib/live-game/server/question-set-list";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

export const dynamic = "force-dynamic";

export async function GET() {
  return withLiveGameServerTiming("live_game_question_sets", async (timer) => {
    const {
      data: { user },
    } = await timer.measure("auth", async () => {
      const supabase = await createClient();
      return supabase.auth.getUser();
    });
    if (!user || !isTeacher(user)) {
      return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
    }
    timer.setContext({ role: "host" });

    try {
      const listed = await timer.measure("supabase_query", () =>
        listPublishedQuestionSetsForHostWithMeta(),
      );
      const body = await timer.measure("serialization", () => ({
        sets: listed.sets,
        meta: {
          resultCount: listed.resultCount,
          queryCount: listed.queryCount,
          queryStrategy: listed.queryStrategy,
          teacherId: user.id,
        },
      }));
      return NextResponse.json(body, {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Live-Game-Query-Count": String(listed.queryCount),
          "X-Live-Game-Query-Strategy": listed.queryStrategy,
          "X-Live-Game-Result-Count": String(listed.resultCount),
        },
      });
    } catch (error) {
      console.error("Live-game question set list failed", error);
      return NextResponse.json(
        { error: "Could not load question sets right now." },
        { status: 503 },
      );
    }
  });
}
