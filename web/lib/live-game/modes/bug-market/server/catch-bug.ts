import "server-only";

import { LiveMap, LiveObject } from "@liveblocks/client";
import type { LiveGamePlayerPosition } from "@/lib/live-game/liveblocks/config";
import {
  createBugMarketPlayerState,
  type BugMarketCatchReceipt,
  type BugMarketInventoryItem,
  type BugMarketPlayerState,
  type BugMarketWorldBug,
} from "@/lib/live-game/modes/bug-market/state";
import {
  doesBugMarketCatchSucceed,
  validateBugMarketCatch,
  type BugMarketCatchValidation,
} from "@/lib/live-game/modes/bug-market/catch-rules";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";

export type CatchBugResult =
  | { accepted: true; receipt: BugMarketCatchReceipt; alreadyResolved: boolean; inventoryCount: number }
  | { accepted: false; reason: Exclude<BugMarketCatchValidation, { ok: true }>["reason"] | "wrong_mode" | "not_playing" | "bug_not_found" };

function readReceipt(value: LiveObject<BugMarketCatchReceipt>): BugMarketCatchReceipt {
  return {
    clientActionId: value.get("clientActionId"),
    playerId: value.get("playerId"),
    bugId: value.get("bugId"),
    outcome: value.get("outcome"),
    inventoryItem: value.get("inventoryItem"),
    resolvedAt: value.get("resolvedAt"),
  };
}

function readBug(value: LiveObject<BugMarketWorldBug>): BugMarketWorldBug {
  return {
    id: value.get("id"),
    speciesId: value.get("speciesId"),
    rarity: value.get("rarity"),
    x: value.get("x"),
    y: value.get("y"),
    movementSeed: value.get("movementSeed"),
    spawnedAt: value.get("spawnedAt"),
    expiresAt: value.get("expiresAt"),
    state: value.get("state"),
    claimedBy: value.get("claimedBy"),
    claimedAt: value.get("claimedAt"),
  };
}

function readPlayer(value: LiveObject<BugMarketPlayerState>): BugMarketPlayerState {
  return {
    playerId: value.get("playerId"),
    coins: value.get("coins"),
    netLevel: value.get("netLevel"),
    displayCaseLevel: value.get("displayCaseLevel"),
    inventory: value.get("inventory"),
    bugsCaught: value.get("bugsCaught"),
    bugsSold: value.get("bugsSold"),
    lastSwingAt: value.get("lastSwingAt"),
  };
}

function readPosition(value: LiveObject<LiveGamePlayerPosition> | undefined): LiveGamePlayerPosition | null {
  if (!value) return null;
  return { x: value.get("x"), y: value.get("y"), updatedAt: value.get("updatedAt") };
}

export async function catchBug(input: {
  roomId: string;
  playerId: string;
  bugId: string;
  clientActionId: string;
}): Promise<CatchBugResult> {
  let result: CatchBugResult = { accepted: false, reason: "bug_not_found" };

  await getLiveblocksServerClient().mutateStorage(input.roomId, ({ root }) => {
    const liveRoot = root as unknown as { get(key: string): unknown; set(key: string, value: unknown): void };
    const session = liveRoot.get("session") as LiveObject<{ modeId: string; phase: string }> | undefined;
    if (session?.get("modeId") !== "bug_market") {
      result = { accepted: false, reason: "wrong_mode" };
      return;
    }
    if (session.get("phase") !== "playing") {
      result = { accepted: false, reason: "not_playing" };
      return;
    }

    const receipts = liveRoot.get("bugMarketCatchReceipts") as LiveMap<string, LiveObject<BugMarketCatchReceipt>> | undefined;
    const players = liveRoot.get("bugMarketPlayers") as LiveMap<string, LiveObject<BugMarketPlayerState>> | undefined;
    const bugs = liveRoot.get("bugs") as LiveMap<string, LiveObject<BugMarketWorldBug>> | undefined;
    const positions = liveRoot.get("playerPositions") as LiveMap<string, LiveObject<LiveGamePlayerPosition>> | undefined;
    if (!receipts || !players || !bugs) return;

    const prior = receipts.get(input.clientActionId);
    if (prior) {
      const receipt = readReceipt(prior);
      result = {
        accepted: true,
        receipt,
        alreadyResolved: true,
        inventoryCount: players.get(input.playerId)?.get("inventory").length ?? 0,
      };
      return;
    }

    const bugObject = bugs.get(input.bugId);
    if (!bugObject) return;
    const bug = readBug(bugObject);
    let playerObject = players.get(input.playerId);
    if (!playerObject) {
      playerObject = new LiveObject(createBugMarketPlayerState(input.playerId));
      players.set(input.playerId, playerObject);
    }
    const player = readPlayer(playerObject);
    const position = readPosition(positions?.get(input.playerId));
    const now = Date.now();
    const validation = validateBugMarketCatch({ bug, player, position, now });
    if (!validation.ok) {
      result = { accepted: false, reason: validation.reason };
      return;
    }

    playerObject.set("lastSwingAt", now);
    const caught = doesBugMarketCatchSucceed({ clientActionId: input.clientActionId, bug });
    let inventoryItem: BugMarketInventoryItem | null = null;
    if (caught) {
      inventoryItem = {
        id: `caught:${input.clientActionId}`,
        speciesId: bug.speciesId,
        rarity: bug.rarity,
        caughtAt: now,
      };
      playerObject.set("inventory", [...player.inventory, inventoryItem]);
      playerObject.set("bugsCaught", player.bugsCaught + 1);
      bugObject.set("state", "caught");
      bugObject.set("claimedBy", input.playerId);
      bugObject.set("claimedAt", now);
    }

    const receipt: BugMarketCatchReceipt = {
      clientActionId: input.clientActionId,
      playerId: input.playerId,
      bugId: input.bugId,
      outcome: caught ? "caught" : "missed",
      inventoryItem,
      resolvedAt: now,
    };
    receipts.set(input.clientActionId, new LiveObject(receipt));
    result = {
      accepted: true,
      receipt,
      alreadyResolved: false,
      inventoryCount: player.inventory.length + (caught ? 1 : 0),
    };
  });

  return result;
}
