import { NextResponse } from "next/server";
import type { LiveGameRoundEndReason } from "@/lib/live-game/liveblocks/config";
import { resetEnglishCraftGameplayState, resetEnglishCraftVictoryFields } from "@/lib/live-game/liveblocks/gameplay-reset";
import { canUseUnlimitedLiveGameDuration } from "@/lib/live-game/premium";
import { normalizeEnglishCraftDurationMinutes } from "@/lib/live-game/modes/english-craft/config";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { asLiveGameMutatorRoot } from "@/lib/live-game/server/mutator";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import { getQuestionSetSnapshot } from "@/lib/live-game/server/question-set-resolver";
import {
  ensureActiveLiveGameReportRound,
  finalizeLiveGameReportRound,
} from "@/lib/live-game/server/report-repository";
import { extendSessionDeadline } from "@/lib/live-game/session-timer";
import { expireLiveGameRoomChallenges } from "@/lib/live-game/server/challenge-store";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

type ControlAction = "start" | "return_to_lobby" | "end_round" | "close" | "set_duration" | "add_time";

async function handlePost(request: Request) {
  try {
    const body = (await request.json()) as {
      roomId?: string;
      action?: ControlAction;
      reason?: LiveGameRoundEndReason;
      durationMinutes?: number | null;
    };
    if (!body.roomId || !body.action) {
      return NextResponse.json({ error: "roomId and action are required." }, { status: 400 });
    }
    const player = await requireLiveGamePlayerSession(body.roomId);
    const liveblocks = getLiveblocksServerClient();
    let applied = false;
    let canonicalEndsAt: number | null = null;
    await liveblocks.mutateStorage(body.roomId, ({ root }) => {
      const storage = asLiveGameMutatorRoot(root as never);
      const session = storage.get("session");
      if (!session) return;
      const phase = session.get("phase");
      const hostOnly = body.action !== "end_round" || body.reason !== "timeout";
      if (hostOnly && player.role !== "host") return;

      if (body.action === "start" && phase === "lobby") {
        const duration = session.get("durationMinutes");
        session.set("phase", "playing");
        session.set("lobbyNotice", null);
        session.set("endsAt", typeof duration === "number" ? Date.now() + duration * 60_000 : null);
        resetEnglishCraftVictoryFields(session as never);
        resetEnglishCraftGameplayState(storage);
        applied = true;
      } else if (body.action === "return_to_lobby" && phase === "completed") {
        session.set("phase", "lobby");
        session.set("endsAt", null);
        session.set("lobbyNotice", null);
        resetEnglishCraftVictoryFields(session as never);
        resetEnglishCraftGameplayState(storage);
        applied = true;
      } else if (body.action === "end_round" && phase === "playing") {
        const reason = body.reason === "timeout" ? "timeout" : "host_ended_early";
        if (reason === "timeout") {
          const endsAt = session.get("endsAt");
          if (typeof endsAt !== "number" || Date.now() < endsAt) return;
        }
        session.set("phase", "completed");
        session.set("endsAt", null);
        session.set("lobbyNotice", { reason, at: Date.now() });
        resetEnglishCraftVictoryFields(session as never);
        applied = true;
      } else if (body.action === "close" && phase === "lobby") {
        session.set("phase", "ended");
        session.set("endsAt", null);
        session.set("endedAt", Date.now());
        session.set("endReason", "host_closed");
        applied = true;
      } else if (body.action === "set_duration" && phase === "lobby") {
        if (body.durationMinutes == null) {
          if (!canUseUnlimitedLiveGameDuration(player.playerId)) return;
          session.set("durationMinutes", null);
        } else {
          session.set("durationMinutes", normalizeEnglishCraftDurationMinutes(body.durationMinutes));
        }
        applied = true;
      } else if (body.action === "add_time" && phase === "playing" && player.role === "host") {
        const currentEndsAt = session.get("endsAt");
        if (typeof currentEndsAt !== "number") return;
        canonicalEndsAt = extendSessionDeadline(currentEndsAt, Date.now());
        session.set("endsAt", canonicalEndsAt);
        applied = true;
      }
    });
    if (!applied) return NextResponse.json({ error: "Action not allowed." }, { status: 409 });

    if (body.action === "start" || body.action === "end_round") {
      const snapshot = await readLiveGameStorageJson(body.roomId);
      if (!snapshot?.session) throw new Error("Live Game report snapshot unavailable.");
      const binding = readSessionQuestionSetBinding(snapshot.session);
      const questionSet = await getQuestionSetSnapshot(binding.ref, binding.version);
      if (body.action === "start") {
        await ensureActiveLiveGameReportRound(snapshot, questionSet);
      } else {
        await expireLiveGameRoomChallenges(body.roomId);
        await finalizeLiveGameReportRound({
          storage: snapshot,
          questionSet,
          reason: body.reason === "timeout" ? "timeout" : "host_ended_early",
        });
      }
    }
    return NextResponse.json({ ok: true, endsAt: canonicalEndsAt });
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live-game control failed", error);
    return NextResponse.json({ error: "Control service unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_control", () => handlePost(request));
}
