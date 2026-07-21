import { NextResponse } from "next/server";
import { canHostLive, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

export async function GET() {
  return withLiveGameServerTiming("live_game_classes", async (timer) => {
    const supabase = await timer.measure("auth", async () => {
      const client = await createClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      return { client, user };
    });
    if (!supabase.user || !isTeacher(supabase.user)) {
      return NextResponse.json({ error: "Teacher login required." }, { status: 401 });
    }
    if (!canHostLive(supabase.user)) {
      return NextResponse.json({ error: "Live hosting requires Teacher Plus." }, { status: 403 });
    }
    timer.setContext({ role: "host" });
    const { data, error } = await timer.measure("supabase_query", () =>
      supabase.client
        .from("teacher_classes")
        .select("id,title")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
    );
    if (error) {
      console.error("Could not list Live Game teacher classes", error);
      return NextResponse.json({ error: "Could not load classes." }, { status: 503 });
    }
    const classes = data ?? [];
    return NextResponse.json(
      {
        classes,
        meta: {
          resultCount: classes.length,
          queryCount: 1,
          queryStrategy: "single_select",
          teacherId: supabase.user.id,
          classLoadDeferred: true,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Live-Game-Query-Count": "1",
          "X-Live-Game-Query-Strategy": "single_select",
          "X-Live-Game-Result-Count": String(classes.length),
        },
      },
    );
  });
}
