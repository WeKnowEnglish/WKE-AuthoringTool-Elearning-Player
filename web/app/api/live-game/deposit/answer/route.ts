import { NextResponse } from "next/server";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import { isDepositSpellCorrect } from "@/lib/live-game/server/question-set-resolver";
import { isDepositSpellCorrect as validateDepositSpelling } from "@/lib/live-game/question-banks/schemas";
import { challengeMatchesQuestionBank, readChallengeQuestionSetContext } from "@/lib/live-game/server/question-set-challenge-context";
import { awardDepositForCarry } from "@/lib/live-game/server/award-deposit";
import { normalizeAwardReceipt } from "@/lib/live-game/server/award-receipt";
import {
  claimLiveGameChallengeAward,
  getLiveGameChallenge,
  markChallengeAwarded,
  markChallengeSkipped,
} from "@/lib/live-game/server/challenge-store";
import { readPlayerCarry } from "@/lib/live-game/server/player-carry";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import { findNearestInteractable } from "@/lib/live-game/engine/interact";
import { ENGLISH_CRAFT_STORAGE_BY_TYPE, toStorageInteractTarget } from "@/lib/live-game/modes/english-craft/map-objects-v1";

type DepositAnswerRequestBody = {
  roomId?: string;
  challengeId?: string;
  spelling?: string;
  skip?: boolean;
};

function parseDepositAnswerBody(body: unknown): DepositAnswerRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as DepositAnswerRequestBody;
  if (typeof record.roomId !== "string" || typeof record.challengeId !== "string") {
    return null;
  }
  if (record.skip === true) {
    return {
      roomId: record.roomId,
      challengeId: record.challengeId,
      spelling: typeof record.spelling === "string" ? record.spelling : "",
      skip: true,
    };
  }
  if (typeof record.spelling !== "string") {
    return null;
  }
  return record;
}

function depositAnswerPayload(
  storage: Awaited<ReturnType<typeof readLiveGameStorageJson>>,
  input: {
    correct: boolean;
    resourceDeposited?: { type: string; amount: number } | null;
    carryCleared?: boolean;
    carryRetained?: boolean;
    alreadyAwarded?: boolean;
    skipped?: boolean;
    poolTotal?: ReturnType<typeof readResourcePool>;
  },
) {
  return {
    correct: input.correct,
    resourceDeposited: input.resourceDeposited ?? null,
    poolTotal: input.poolTotal ?? readResourcePool(storage),
    carryCleared: input.carryCleared,
    carryRetained: input.carryRetained,
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

  const parsed = parseDepositAnswerBody(body);
  if (!parsed?.roomId || !parsed.challengeId) {
    return NextResponse.json(
      { error: "roomId and challengeId are required." },
      { status: 400 },
    );
  }

  const roomId = parsed.roomId.trim();
  const challengeId = parsed.challengeId.trim();
  const spelling = parsed.spelling ?? "";
  const skip = parsed.skip === true;
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;

  const [challenge, storage] = await Promise.all([
    getLiveGameChallenge(challengeId),
    readLiveGameStorageJson(roomId),
  ]);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (challenge.roomId !== roomId || challenge.playerId !== playerId) {
    return NextResponse.json({ error: "Challenge mismatch." }, { status: 403 });
  }
  if (!challengeMatchesQuestionBank(challenge, "deposit")) {
    return NextResponse.json({ error: "Invalid deposit challenge." }, { status: 403 });
  }

  if (!storage?.session || storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  if (challenge.status === "awarded") {
    const receipt = normalizeAwardReceipt(storage.awardReceipts?.[challengeId]);
    if (receipt?.awardKind === "pool") {
      return NextResponse.json(
        depositAnswerPayload(storage, {
          correct: true,
          resourceDeposited: { type: receipt.resourceType, amount: 1 },
          carryCleared: true,
          alreadyAwarded: true,
        }),
      );
    }
    return NextResponse.json(
      depositAnswerPayload(storage, { correct: true, alreadyAwarded: true }),
    );
  }

  const carry = readPlayerCarry(storage, playerId);
  if (!carry) {
    return NextResponse.json({ error: "Nothing to deposit." }, { status: 409 });
  }

  const storageDef = ENGLISH_CRAFT_STORAGE_BY_TYPE[carry.resourceType];
  const position = storage.playerPositions?.[playerId];
  if (
    challenge.nodeId !== storageDef.id ||
    !position ||
    !findNearestInteractable(position.x, position.y, [toStorageInteractTarget(storageDef)])
  ) {
    return NextResponse.json({ error: "Move closer to the correct storage." }, { status: 409 });
  }

  const ctx = readChallengeQuestionSetContext(storage.session, challenge);
  if (skip) {
    const skipped = await markChallengeSkipped(challengeId);
    if (!skipped) return NextResponse.json({ error: "Challenge can no longer be skipped." }, { status: 409 });
    return NextResponse.json(
      depositAnswerPayload(storage, { correct: false, carryRetained: true, skipped: true }),
    );
  }
  const correct =
    challenge.validationPayload?.type === "deposit_spell" ?
      validateDepositSpelling(challenge.validationPayload, spelling)
    : await isDepositSpellCorrect(ctx.ref, challenge.questionId, spelling, ctx.version);
  if (!correct) {
    return NextResponse.json(
      depositAnswerPayload(storage, {
        correct: false,
        carryRetained: true,
      }),
    );
  }

  const claim = await claimLiveGameChallengeAward(challengeId);
  if (claim.kind === "missing") {
    return NextResponse.json({ error: "Challenge expired or not found." }, { status: 404 });
  }
  if (claim.kind === "processing") {
    return NextResponse.json(
      { error: "Answer is already being processed. Please retry." },
      { status: 409 },
    );
  }
  if (claim.kind === "awarded") {
    const latest = await readLiveGameStorageJson(roomId);
    const receipt = normalizeAwardReceipt(latest?.awardReceipts?.[challengeId]);
    return NextResponse.json(
      depositAnswerPayload(latest, {
        correct: true,
        resourceDeposited:
          receipt?.awardKind === "pool" ?
            { type: receipt.resourceType, amount: 1 }
          : null,
        carryCleared: receipt?.awardKind === "pool",
        alreadyAwarded: true,
      }),
    );
  }

  const award = await awardDepositForCarry({
    roomId,
    playerId,
    challengeId,
  });
  if (!award) {
    return NextResponse.json({ error: "Could not deposit this resource right now." }, { status: 409 });
  }

  await markChallengeAwarded(challengeId);

  const poolTotal = {
    ...readResourcePool(storage),
    [award.resourceType]: award.poolCount,
  };
  return NextResponse.json(
    depositAnswerPayload(storage, {
      correct: true,
      resourceDeposited: { type: award.resourceType, amount: 1 },
      carryCleared: true,
      alreadyAwarded: award.alreadyAwarded,
      poolTotal,
    }),
  );
}

export async function POST(request: Request) {
  try {
    return await withLiveGameServerTiming("live_game_deposit_answer", () => handlePost(request));
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live-game deposit answer request failed", error);
    return NextResponse.json(
      { error: "The deposit answer service is temporarily unavailable. Your answer can be retried." },
      { status: 503 },
    );
  }
}
