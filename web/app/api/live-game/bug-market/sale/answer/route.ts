import { NextResponse } from "next/server";
import { isHarvestAnswerCorrect as validateHarvestAnswer } from "@/lib/live-game/question-banks/schemas";
import { isNearBugMarketCounter } from "@/lib/live-game/modes/bug-market/sale-rules";
import { sellBugForCorrectAnswer } from "@/lib/live-game/modes/bug-market/server/sell-bug";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  markChallengeAwarded,
  releaseLiveGameChallengeAwardClaim,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

const SALE_NODE_PREFIX = "bug-market-sale:";

export async function POST(request: Request) {
  return withLiveGameServerTiming("bug_market_sale_answer", async (timer) => {
    try {
      const body = await request.json() as { roomId?: string; challengeId?: string; answer?: string };
      if (!body.roomId || !body.challengeId || typeof body.answer !== "string") return NextResponse.json({ error: "roomId, challengeId, and answer are required." }, { status: 400 });
      const identity = await timer.measure("auth", () => requireLiveGamePlayerSession(body.roomId!));
      const [challenge, storage] = await Promise.all([
        timer.measure("challenge_lookup", () => getLiveGameChallenge(body.challengeId!)),
        timer.measure("liveblocks_read", () => readLiveGameStorageJson(body.roomId!)),
      ]);
      if (!challenge) return NextResponse.json({ error: "Question expired. Try selling again." }, { status: 404 });
      if (challenge.roomId !== body.roomId || challenge.playerId !== identity.playerId || challenge.questionBank !== "harvest" || !challenge.nodeId.startsWith(SALE_NODE_PREFIX)) return NextResponse.json({ error: "Question mismatch." }, { status: 403 });
      if (!storage?.session || storage.session.modeId !== "bug_market" || storage.session.phase !== "playing") return NextResponse.json({ error: "Bug Market is not in progress." }, { status: 409 });
      if (challenge.status !== "awarded" && !isNearBugMarketCounter(storage.playerPositions?.[identity.playerId] ?? null)) return NextResponse.json({ error: "Stay near your counter to finish the sale." }, { status: 409 });
      const inventoryItemId = challenge.nodeId.slice(SALE_NODE_PREFIX.length);
      const prior = storage.bugMarketSaleReceipts?.[challenge.challengeId];
      if (prior) {
        await markChallengeAwarded(challenge.challengeId);
        return NextResponse.json({ correct: true, receipt: prior, alreadyAwarded: true });
      }
      if (challenge.validationPayload?.type !== "multiple_choice" || !validateHarvestAnswer(challenge.validationPayload, body.answer)) return NextResponse.json({ correct: false });

      const claim = await claimLiveGameChallengeAward(challenge.challengeId);
      if (claim.kind === "missing") return NextResponse.json({ error: "Question expired. Try selling again." }, { status: 404 });
      if (claim.kind === "processing") return NextResponse.json({ error: "Sale is already being processed. Please retry." }, { status: 409 });
      if (claim.kind === "awarded") {
        const latest = await readLiveGameStorageJson(body.roomId);
        const receipt = latest?.bugMarketSaleReceipts?.[challenge.challengeId];
        return receipt ? NextResponse.json({ correct: true, receipt, alreadyAwarded: true }) : NextResponse.json({ error: "Sale receipt unavailable. Please retry." }, { status: 409 });
      }
      const sale = await sellBugForCorrectAnswer({ roomId: body.roomId, playerId: identity.playerId, inventoryItemId, challengeId: challenge.challengeId });
      if (!sale.awarded) {
        await releaseLiveGameChallengeAwardClaim(challenge.challengeId);
        return NextResponse.json({ error: sale.reason === "bug_not_owned" ? "That bug is no longer in your display case." : "Could not complete the sale." }, { status: 409 });
      }
      await markChallengeAwarded(challenge.challengeId);
      return NextResponse.json({ correct: true, receipt: sale.receipt, alreadyAwarded: sale.alreadyAwarded });
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      console.error("Bug Market sale answer failed", error);
      return NextResponse.json({ error: "Could not submit the market answer." }, { status: 503 });
    }
  });
}
