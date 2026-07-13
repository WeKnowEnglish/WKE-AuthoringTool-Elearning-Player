import { NextResponse } from "next/server";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";
import { assertLiveblocksSecret } from "@/lib/env/liveblocks-server";
import {
  ENGLISH_CRAFT_CRAFT_BENCH_ID,
} from "@/lib/live-game/modes/english-craft/gameplay-v1";
import {
  formatMissingRecipeResources,
  formatRecipeFullCostSummary,
  getCraftRecipe,
  isCraftRecipeId,
  missingRecipeRequirements,
} from "@/lib/live-game/modes/english-craft/craft-recipes-v1";
import { toClientCraftQuestionFromRow } from "@/lib/live-game/question-banks/client-payloads";
import {
  getQuestionById,
  pickCraftQuestion,
} from "@/lib/live-game/server/question-set-resolver";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import {
  createLiveGameChallenge,
} from "@/lib/live-game/server/challenge-store";
import {
  canStartRecipeCraft,
  readLiveGameStorageJson,
} from "@/lib/live-game/server/read-storage";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { expandInteractRadius, findNearestInteractable } from "@/lib/live-game/engine/interact";
import { LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX } from "@/lib/live-game/challenge-prefetch";
import { ENGLISH_CRAFT_CRAFT_BENCH_V1 } from "@/lib/live-game/modes/english-craft/map-objects-v1";
import { readResourcePool } from "@/lib/live-game/resource-pool";
import { readCraftedItems } from "@/lib/live-game/server/read-crafted-items";

type CraftChallengeRequestBody = {
  roomId?: string;
  recipeId?: string;
};

function parseCraftChallengeBody(body: unknown): CraftChallengeRequestBody | null {
  if (!body || typeof body !== "object") return null;
  const record = body as CraftChallengeRequestBody;
  if (typeof record.roomId !== "string" || typeof record.recipeId !== "string") {
    return null;
  }
  return record;
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

  const parsed = parseCraftChallengeBody(body);
  if (!parsed?.roomId || !parsed.recipeId) {
    return NextResponse.json({ error: "roomId and recipeId are required." }, { status: 400 });
  }

  if (!isCraftRecipeId(parsed.recipeId)) {
    return NextResponse.json({ error: "Unknown craft recipe." }, { status: 400 });
  }

  const recipeId = parsed.recipeId;
  const recipe = getCraftRecipe(recipeId);
  const roomId = parsed.roomId.trim();
  const playerId = (await requireLiveGamePlayerSession(roomId)).playerId;
  const nodeId = ENGLISH_CRAFT_CRAFT_BENCH_ID;

  if (!roomId.startsWith("wke-live-game-")) {
    return NextResponse.json({ error: "Invalid room id." }, { status: 400 });
  }

  const storage = await readLiveGameStorageJson(roomId);
  if (!storage?.session) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  const binding = readSessionQuestionSetBinding(storage.session);
  if (storage.session.phase !== "playing") {
    return NextResponse.json({ error: "Game is not in progress." }, { status: 409 });
  }
  if (!canStartRecipeCraft(storage, recipeId)) {
    const crafted = readCraftedItems(storage);
    const missing = missingRecipeRequirements(readResourcePool(storage), crafted, recipe);
    return NextResponse.json(
      { error: formatMissingRecipeResources(missing, recipe), missing, recipeId },
      { status: 409 },
    );
  }
  const position = storage.playerPositions?.[playerId];
  if (
    !position ||
    Date.now() - position.updatedAt > 5_000 ||
    !findNearestInteractable(position.x, position.y, [
      expandInteractRadius(
        ENGLISH_CRAFT_CRAFT_BENCH_V1,
        LIVE_GAME_CHALLENGE_PREFETCH_RADIUS_BONUS_PX,
      ),
    ])
  ) {
    return NextResponse.json({ error: "Move closer to the workbench." }, { status: 409 });
  }

  const craftSeed = `${playerId}:${recipeId}:0`;
  const pickedCraftRow = await pickCraftQuestion(binding.ref, binding.version, craftSeed);
  const challenge = await createLiveGameChallenge({
    roomId,
    playerId,
    nodeId,
    questionId: pickedCraftRow.id,
    questionSetId: binding.setId,
    questionSetVersion: binding.version,
    questionBank: "craft",
    validationPayload: pickedCraftRow.payload,
  });
  const craftRow =
    challenge.questionId === pickedCraftRow.id ? pickedCraftRow
    : (await getQuestionById(binding.ref, "craft", challenge.questionId, binding.version)) ?? pickedCraftRow;

  return NextResponse.json({
    challengeId: challenge.challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    question: toClientCraftQuestionFromRow(craftRow, challenge.challengeId),
    recipeId,
    recipeLabel: recipe.label,
    costSummary: formatRecipeFullCostSummary(recipe),
  });
}

export async function POST(request: Request) {
  try {
    return await withLiveGameServerTiming("live_game_craft_challenge", () => handlePost(request));
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    console.error("Live-game craft challenge request failed", error);
    return NextResponse.json(
      { error: "The craft challenge service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
