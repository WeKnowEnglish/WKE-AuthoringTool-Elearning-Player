import { NextResponse } from "next/server";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { isHarvestAnswerCorrect } from "@/lib/live-game/server/question-set-resolver";
import { isHarvestAnswerCorrect as validateHarvestAnswer } from "@/lib/live-game/question-banks/schemas";
import { challengeMatchesQuestionBank, readChallengeQuestionSetContext } from "@/lib/live-game/server/question-set-challenge-context";
import { awardCarryForNode } from "@/lib/live-game/server/award-carry";
import { normalizeAwardReceipt } from "@/lib/live-game/server/award-receipt";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  markChallengeAwarded,
  markChallengeSkipped,
} from "@/lib/live-game/server/challenge-store";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readResourcePool } from "@/lib/live-game/resource-pool";

type AnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  answer?: string;
  responseTimeMs?: number;
  skip?: boolean;
};

function parseAnswerBody(body: unknown): AnswerRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as AnswerRequestBody;
  if (typeof record.roomId !== "string" || typeof record.challengeId !== "string") {
    return null;
  }
  if (record.skip === true) {
    return {
      roomId: record.roomId,
      challengeId: record.challengeId,
      answer: typeof record.answer === "string" ? record.answer : "",
      skip: true,
    };
  }
  if (typeof record.answer !== "string") {
    return null;
  }
  return record;
}

function harvestAnswerPayload(
  storage: Awaited<ReturnType<typeof readLiveGameStorageJson>>,
  input: {
    correct: boolean;
    carryGranted?: { type: string; sourceNodeId: string } | null;
    nodeCooldownEndsAt?: number;
    alreadyAwarded?: boolean;
    skipped?: boolean;
  },
) {
  return {
    correct: input.correct,
    carryGranted: input.carryGranted ?? null,
    resourceAwarded: null,
    poolTotal: readResourcePool(storage),
    nodeCooldownEndsAt: input.nodeCooldownEndsAt,
    alreadyAwarded: input.alreadyAwarded,
    skipped: input.skipped,
  };
}

async function handlePost(request: Request) {
  try {
    assertLiveblocksSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Liveblocks is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseAnswerBody(body);
  if (!parsed?.roomId || !parsed.challengeId) {
    return NextResponse.json(
      { error: "roomId and challengeId are required." },
      { status: 400 },
    );
  }

  const roomId = parsed.roomId.trim();
  const challengeId = parsed.challengeId.trim();
  const answer = (parsed.answer ?? "").trim();
  const skip = parsed.skip === true;
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;

  const challenge = await getLiveGameChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (challenge.roomId !== roomId || challenge.playerId !== playerId) {
    return NextResponse.json({ error: "Challenge mismatch." }, { status: 403 });
  }
  if (!challengeMatchesQuestionBank(challenge, "harvest")) {
    return NextResponse.json({ error: "Invalid harvest challenge." }, { status: 403 });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session || storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  if (challenge.status === "awarded") {
    const receipt = normalizeAwardReceipt(storage.awardReceipts?.[challengeId]);
    if (receipt?.awardKind === "carry") {
      return NextResponse.json(
        harvestAnswerPayload(storage, {
          correct: true,
          carryGranted: { type: receipt.resourceType, sourceNodeId: challenge.nodeId },
          nodeCooldownEndsAt: receipt.nodeCooldownEndsAt,
          alreadyAwarded: true,
        }),
      );
    }
    return NextResponse.json(
      harvestAnswerPayload(storage, {
        correct: true,
        alreadyAwarded: true,
      }),
    );
  }

  const ctx = readChallengeQuestionSetContext(storage.session, challenge);
  if (skip) {
    const skipped = await markChallengeSkipped(challengeId);
    if (!skipped) return NextResponse.json({ error: "Challenge can no longer be skipped." }, { status: 409 });
    return NextResponse.json(harvestAnswerPayload(storage, { correct: false, skipped: true }));
  }
  const correct =
    challenge.validationPayload?.type === "multiple_choice" ?
      validateHarvestAnswer(challenge.validationPayload, answer)
    : await isHarvestAnswerCorrect(ctx.ref, challenge.questionId, answer, ctx.version);
  if (!correct) {
    return NextResponse.json(
      harvestAnswerPayload(storage, {
        correct: false,
      }),
    );
  }

  const claim = await claimLiveGameChallengeAward(challengeId);
  if (claim.kind === "missing") {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (claim.kind === "processing") {
    return NextResponse.json({ error: "Answer is already being processed. Please retry." }, { status: 409 });
  }
  if (claim.kind === "awarded") {
    const latest = await readLiveGameStorageJson(roomId);
    const receipt = normalizeAwardReceipt(latest?.awardReceipts?.[challengeId]);
    return NextResponse.json(
      harvestAnswerPayload(latest, {
        correct: true,
        carryGranted:
          receipt?.awardKind === "carry" ?
            { type: receipt.resourceType, sourceNodeId: challenge.nodeId }
          : null,
        nodeCooldownEndsAt: receipt?.nodeCooldownEndsAt,
        alreadyAwarded: true,
      }),
    );
  }

  const award = await awardCarryForNode({
    roomId,
    playerId,
    nodeId: challenge.nodeId,
    challengeId,
    questionId: challenge.questionId,
  });
  if (!award) {
    return NextResponse.json({ error: "Could not award carry for this resource." }, { status: 409 });
  }

  await markChallengeAwarded(challengeId);

  return NextResponse.json(
    harvestAnswerPayload(storage, {
      correct: true,
      carryGranted: { type: award.resourceType, sourceNodeId: award.sourceNodeId },
      nodeCooldownEndsAt: award.nodeCooldownEndsAt,
      alreadyAwarded: award.alreadyAwarded,
    }),
  );
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game answer request failed", error);
    return NextResponse.json(
      { error: "The answer service is temporarily unavailable. Your answer can be retried." },
      { status: 503 },
    );
  }
}
