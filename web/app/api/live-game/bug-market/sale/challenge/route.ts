import { NextResponse } from "next/server";
import { toClientMcQuestionFromRow } from "@/lib/live-game/question-banks/client-payloads";
import { isNearBugMarketCounter } from "@/lib/live-game/modes/bug-market/sale-rules";
import { advanceQuestionDeckCursor, readQuestionDeckCursor } from "@/lib/live-game/server/question-deck-cursor";
import { createLiveGameChallenge } from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import { pickHarvestQuestionFromDeck } from "@/lib/live-game/server/question-set-resolver";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

const SALE_NODE_PREFIX = "bug-market-sale:";

export async function POST(request: Request) {
  return withLiveGameServerTiming("bug_market_sale_challenge", async (timer) => {
    try {
      const body = await request.json() as { roomId?: string; inventoryItemId?: string };
      if (!body.roomId || !body.inventoryItemId) return NextResponse.json({ error: "roomId and inventoryItemId are required." }, { status: 400 });
      const identity = await timer.measure("auth", () => requireLiveGamePlayerSession(body.roomId!));
      const storage = await timer.measure("liveblocks_read", () => readLiveGameStorageJson(body.roomId!));
      if (!storage?.session || storage.session.modeId !== "bug_market" || storage.session.phase !== "playing") return NextResponse.json({ error: "Bug Market is not in progress." }, { status: 409 });
      const player = storage.bugMarketPlayers?.[identity.playerId];
      const item = player?.inventory.find((candidate) => candidate.id === body.inventoryItemId);
      if (!item) return NextResponse.json({ error: "That bug is not in your display case." }, { status: 409 });
      if (!isNearBugMarketCounter(storage.playerPositions?.[identity.playerId] ?? null)) return NextResponse.json({ error: "Move to your counter before selling." }, { status: 409 });
      const binding = readSessionQuestionSetBinding(storage.session);
      const cursor = readQuestionDeckCursor(storage.questionDeckCursors, identity.playerId, "harvest");
      const question = await pickHarvestQuestionFromDeck(binding.ref, binding.version, { roomId: body.roomId, playerId: identity.playerId, cursor });
      const challenge = await createLiveGameChallenge({
        roomId: body.roomId, playerId: identity.playerId,
        nodeId: `${SALE_NODE_PREFIX}${item.id}`, questionId: question.id,
        questionSetId: binding.setId, questionSetVersion: binding.version,
        questionBank: "harvest", validationPayload: question.payload,
      });
      await advanceQuestionDeckCursor({ roomId: body.roomId, playerId: identity.playerId, bank: "harvest", cursor });
      return NextResponse.json({
        challengeId: challenge.challengeId,
        expiresAt: new Date(challenge.expiresAt).toISOString(),
        inventoryItemId: item.id,
        question: toClientMcQuestionFromRow(question, challenge.challengeId),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      console.error("Bug Market sale challenge failed", error);
      return NextResponse.json({ error: "Could not open the market question." }, { status: 503 });
    }
  });
}
