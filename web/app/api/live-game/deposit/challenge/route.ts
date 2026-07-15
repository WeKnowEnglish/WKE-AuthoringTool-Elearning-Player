import { NextResponse } from "next/server";
import {
  withLiveGameServerTiming,
  type LiveGameServerTimer,
} from "@/lib/live-game/server/server-timing";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  ENGLISH_CRAFT_STORAGE_BY_TYPE,
  toStorageInteractTarget,
} from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { toClientDepositSpellFromRow } from "@/lib/live-game/question-banks/client-payloads";
import {
  getQuestionById,
  pickDepositQuestionFromDeck,
} from "@/lib/live-game/server/question-set-resolver";
import {
  advanceQuestionDeckCursor,
  readQuestionDeckCursor,
} from "@/lib/live-game/server/question-deck-cursor";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import {
  createLiveGameChallenge,
} from "@/lib/live-game/server/challenge-store";
import { bagHasMatchingResource, readPlayerCarryBag } from "@/lib/live-game/carry-bag";
import type { LiveGameResourceType } from "@/lib/live-game/liveblocks/config";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { expandInteractRadius, findNearestInteractable } from "@/lib/live-game/engine/interact";
import { LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX } from "@/lib/live-game/challenge-prefetch";
import { recordCurrentLiveGameEncounter } from "@/lib/live-game/server/report-evidence";

type DepositChallengeRequestBody = {
  roomId?: string;
  storageId?: string;
  prefetch?: boolean;
};

function parseDepositChallengeBody(body: unknown): DepositChallengeRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as DepositChallengeRequestBody;
  if (typeof record.roomId !== "string" || typeof record.storageId !== "string") {
    return null;
  }
  return { ...record, prefetch: record.prefetch === true };
}

function isStorageId(storageId: string): boolean {
  return Object.values(ENGLISH_CRAFT_STORAGE_BY_TYPE).some((storage) => storage.id === storageId);
}

async function handlePost(request: Request, timer: LiveGameServerTimer) {
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

  const parsed = parseDepositChallengeBody(body);
  if (!parsed?.roomId || !parsed.storageId) {
    return NextResponse.json({ error: "roomId and storageId are required." }, { status: 400 });
  }

  const roomId = parsed.roomId.trim();
  const storageId = parsed.storageId.trim();
  timer.setContext({ roomId });
  const playerId = (await timer.measure("auth", () => requireLiveGamePlayerSession(roomId))).playerId;

  if (!roomId.startsWith("wke-live-game-")) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }
  if (!isStorageId(storageId)) {
    return NextResponse.json({ error: "Unknown storage building." }, { status: 400 });
  }

  const storage = await timer.measure("liveblocks_read", () => readLiveGameStorageJson(roomId));
  if (!storage?.session) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  if (storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }

  const bag = readPlayerCarryBag(storage, playerId);
  if (!bag) {
    return NextResponse.json({ error: "Nothing to deposit." }, { status: 409 });
  }

  const storageDef = Object.values(ENGLISH_CRAFT_STORAGE_BY_TYPE).find((entry) => entry.id === storageId);
  if (!storageDef || !bagHasMatchingResource(bag, storageDef.resourceType as LiveGameResourceType)) {
    return NextResponse.json({ error: "Wrong storage for what you are carrying." }, { status: 409 });
  }

  const binding = readSessionQuestionSetBinding(storage.session);
  const deckCursor = readQuestionDeckCursor(storage.questionDeckCursors, playerId, "deposit");

  const position = storage.playerPositions?.[playerId];
  const interactTarget = toStorageInteractTarget(storageDef);
  if (
    !position ||
    Date.now() - position.updatedAt > 5_000 ||
    !findNearestInteractable(position.x, position.y, [
      expandInteractRadius(interactTarget, LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX),
    ])
  ) {
    return NextResponse.json({ error: "Move closer to storage." }, { status: 409 });
  }

  let pickedDepositRow;
  try {
    pickedDepositRow = await timer.measure("question_select", () =>
      pickDepositQuestionFromDeck(
        binding.ref,
        binding.version,
        { roomId, playerId, cursor: deckCursor },
      ),
    );
  } catch {
    return NextResponse.json({ error: "This question set does not support deposit spelling." }, { status: 409 });
  }

  const [challenge] = await Promise.all([
    timer.measure("supabase_rpc", () =>
      createLiveGameChallenge({
        roomId,
        playerId,
        nodeId: storageId,
        questionId: pickedDepositRow.id,
        questionSetId: binding.setId,
        questionSetVersion: binding.version,
        questionBank: "deposit",
        validationPayload: pickedDepositRow.payload,
      }),
    ),
    timer.measure("liveblocks_mutate", () =>
      advanceQuestionDeckCursor({ roomId, playerId, bank: "deposit", cursor: deckCursor }),
    ),
  ]);
  const depositRow =
    challenge.questionId === pickedDepositRow.id ? pickedDepositRow
    : (await getQuestionById(binding.ref, "deposit", challenge.questionId, binding.version)) ?? pickedDepositRow;

  if (!parsed.prefetch) {
    await timer.measure("reporting", () =>
      recordCurrentLiveGameEncounter({
        storage,
        challenge,
        question: depositRow,
        resourceType: storageDef.resourceType,
      }),
    );
  }

  return NextResponse.json({
    challengeId: challenge.challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    spell: toClientDepositSpellFromRow(depositRow, {
      resourceType: storageDef.resourceType as LiveGameResourceType,
      storageLabel: storageDef.label,
      shuffleSeed: challenge.challengeId,
    }),
  });
}

export async function POST(request: Request) {
  return withLiveGameServerTiming("live_game_deposit_challenge", async (timer) => {
    try {
      return await handlePost(request, timer);
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
        return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      }
      console.error("Live-game deposit challenge request failed", error);
      return NextResponse.json(
        { error: "The deposit challenge service is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
  });
}
