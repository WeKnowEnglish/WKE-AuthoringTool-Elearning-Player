import { NextResponse } from "next/server";
import { catchBug } from "@/lib/live-game/modes/bug-market/server/catch-bug";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

export async function POST(request: Request) {
  return withLiveGameServerTiming("bug_market_catch", async (timer) => {
    try {
      const body = (await request.json()) as {
        roomId?: string;
        bugId?: string;
        clientActionId?: string;
      };
      if (!body.roomId || !body.bugId || !body.clientActionId) {
        return NextResponse.json(
          { error: "roomId, bugId, and clientActionId are required." },
          { status: 400 },
        );
      }
      const identity = await timer.measure("auth", () => requireLiveGamePlayerSession(body.roomId!));
      const result = await timer.measure("liveblocks_mutate", () =>
        catchBug({
          roomId: body.roomId!,
          playerId: identity.playerId,
          bugId: body.bugId!,
          clientActionId: body.clientActionId!,
        }),
      );
      timer.setContext({
        roomId: body.roomId,
        idempotencyOutcome:
          result.accepted && result.alreadyResolved ? "receipt_replay" : result.accepted ? "resolved" : "rejected",
      });
      return result.accepted ?
          NextResponse.json(result)
        : NextResponse.json(result, { status: 409 });
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      }
      return NextResponse.json({ error: "Catch service unavailable." }, { status: 503 });
    }
  });
}
