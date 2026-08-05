import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { getStudioActivityById } from "@/lib/studio-activities/load";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import {
  decodeVcMemberToken,
  vcHostMatchesJoinCode,
  VC_HOST_COOKIE,
  VC_MEMBER_COOKIE,
} from "@/lib/virtual-classroom/session-cookie";
import { normalizeVirtualClassroomLearnActivity } from "@/lib/virtual-classroom/liveblocks/initial-storage";
import { getVirtualClassroomSessionById } from "@/lib/virtual-classroom/server/session";

type RouteContext = { params: Promise<{ sessionId: string }> };

/**
 * Session members load the pack for the shared Learn activity stage.
 * Auth: VC host cookie or member cookie for this session.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getVirtualClassroomSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const member = decodeVcMemberToken(cookieStore.get(VC_MEMBER_COOKIE)?.value);
  const hostOk = vcHostMatchesJoinCode(
    cookieStore.get(VC_HOST_COOKIE)?.value,
    session.joinCode,
  );
  if (
    !hostOk &&
    !(member?.sessionId === session.id || member?.joinCode === session.joinCode)
  ) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const liveblocks = getLiveblocksServerClient();
    const storage = (await liveblocks.getStorageDocument(
      session.liveblocksRoomId,
      "json",
    )) as { runtime?: { learnActivity?: unknown } };
    const learnActivity = normalizeVirtualClassroomLearnActivity(
      storage?.runtime?.learnActivity,
    );
    if (!learnActivity) {
      return NextResponse.json(
        { error: "No activity is shared on the Learn stage yet." },
        { status: 404 },
      );
    }

    const supabase = createServiceRoleSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Server is not configured to load activity packs." },
        { status: 503 },
      );
    }
    const activity = await getStudioActivityById(supabase, learnActivity.activityId, {
      includePack: true,
    });
    if (!activity || activity.pack == null) {
      return NextResponse.json(
        { error: "Activity pack not found. It may have been deleted." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      activityId: activity.id,
      title: learnActivity.title || activity.title,
      format: activity.format,
      playPath: learnActivity.playPath || activity.playPath,
      pack: activity.pack,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load activity pack.",
      },
      { status: 500 },
    );
  }
}
