import { NextResponse } from "next/server";
import { ENGLISH_CRAFT_RESOURCE_NODE_BY_ID, ENGLISH_CRAFT_STORAGE_BY_TYPE } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { isCraftRecipeId } from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { getLiveGameChallenge } from "@/lib/live-game/server/challenge-store";
import { readChallengeQuestionSetContext } from "@/lib/live-game/server/question-set-challenge-context";
import { getQuestionById } from "@/lib/live-game/server/question-set-resolver";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { recordCurrentLiveGameEncounter } from "@/lib/live-game/server/report-evidence";
import {
  withLiveGameServerTiming,
  type LiveGameServerTimer,
} from "@/lib/live-game/server/server-timing";

type OpenEncounterBody = {
  roomId?: string;
  challengeId?: string;
  recipeId?: string;
};

async function handlePost(request: Request, timer: LiveGameServerTimer) {
  const body = (await request.json().catch(() => null)) as OpenEncounterBody | null;
  if (!body?.roomId || !body.challengeId) {
    return NextResponse.json({ error: "roomId and challengeId are required." }, { status: 400 });
  }

  const roomId = body.roomId.trim();
  const challengeId = body.challengeId.trim();
  timer.setContext({ roomId });
  const player = await timer.measure("auth", () => requireLiveGamePlayerSession(roomId));
  const [challenge, storage] = await Promise.all([
    timer.measure("supabase_query", () => getLiveGameChallenge(challengeId)),
    timer.measure("liveblocks_read", () => readLiveGameStorageJson(roomId)),
  ]);
  if (!challenge || challenge.roomId !== roomId || challenge.playerId !== player.playerId) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }
  if (!storage?.session || storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  const context = readChallengeQuestionSetContext(storage.session, challenge);
  const question = await timer.measure("question_select", () =>
    getQuestionById(context.ref, context.bank, challenge.questionId, context.version),
  );
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const resourceType =
    context.bank === "harvest" ? ENGLISH_CRAFT_RESOURCE_NODE_BY_ID[challenge.nodeId]?.resourceType
    : context.bank === "deposit" ? Object.values(ENGLISH_CRAFT_STORAGE_BY_TYPE).find((storageDef) => storageDef.id === challenge.nodeId)?.resourceType
    : undefined;
  const recipeId = context.bank === "craft" && body.recipeId && isCraftRecipeId(body.recipeId)
    ? body.recipeId
    : undefined;

  await timer.measure("reporting", () =>
    recordCurrentLiveGameEncounter({
      storage,
      challenge,
      question,
      resourceType,
      recipeId,
    }),
  );
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_encounter_open", async (timer) => {
    try {
      return await handlePost(request, timer);
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      }
      console.error("Live-game encounter open failed", error);
      return NextResponse.json({ error: "Could not open the learning question." }, { status: 503 });
    }
  });
}
