import "server-only";

import { LiveMap, LiveObject } from "@liveblocks/client";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { bugMarketCoinsForRarity } from "@/lib/live-game/modes/bug-market/sale-rules";
import type { BugMarketPlayerState, BugMarketSaleReceipt } from "@/lib/live-game/modes/bug-market/state";

export type SellBugResult =
  | { awarded: true; receipt: BugMarketSaleReceipt; alreadyAwarded: boolean }
  | { awarded: false; reason: "wrong_mode" | "not_playing" | "player_not_found" | "bug_not_owned" };

export async function sellBugForCorrectAnswer(input: {
  roomId: string;
  playerId: string;
  inventoryItemId: string;
  challengeId: string;
}): Promise<SellBugResult> {
  let result: SellBugResult = { awarded: false, reason: "player_not_found" };
  await getLiveblocksServerClient().mutateStorage(input.roomId, ({ root }) => {
    const liveRoot = root as unknown as { get(key: string): unknown };
    const session = liveRoot.get("session") as LiveObject<{ modeId: string; phase: string }> | undefined;
    if (session?.get("modeId") !== "bug_market") { result = { awarded: false, reason: "wrong_mode" }; return; }
    if (session.get("phase") !== "playing") { result = { awarded: false, reason: "not_playing" }; return; }
    const players = liveRoot.get("bugMarketPlayers") as LiveMap<string, LiveObject<BugMarketPlayerState>> | undefined;
    const receipts = liveRoot.get("bugMarketSaleReceipts") as LiveMap<string, LiveObject<BugMarketSaleReceipt>> | undefined;
    const player = players?.get(input.playerId);
    if (!player || !receipts) return;
    const prior = receipts.get(input.challengeId);
    if (prior) {
      result = {
        awarded: true,
        alreadyAwarded: true,
        receipt: {
          challengeId: prior.get("challengeId"), playerId: prior.get("playerId"),
          inventoryItemId: prior.get("inventoryItemId"), speciesId: prior.get("speciesId"),
          coinsAwarded: prior.get("coinsAwarded"), coinBalance: prior.get("coinBalance"), soldAt: prior.get("soldAt"),
        },
      };
      return;
    }
    const inventory = player.get("inventory");
    const item = inventory.find((candidate) => candidate.id === input.inventoryItemId);
    if (!item) { result = { awarded: false, reason: "bug_not_owned" }; return; }
    const coinsAwarded = bugMarketCoinsForRarity(item.rarity);
    const coinBalance = player.get("coins") + coinsAwarded;
    const receipt: BugMarketSaleReceipt = {
      challengeId: input.challengeId, playerId: input.playerId, inventoryItemId: item.id,
      speciesId: item.speciesId, coinsAwarded, coinBalance, soldAt: Date.now(),
    };
    player.set("inventory", inventory.filter((candidate) => candidate.id !== item.id));
    player.set("coins", coinBalance);
    player.set("bugsSold", player.get("bugsSold") + 1);
    receipts.set(input.challengeId, new LiveObject(receipt));
    result = { awarded: true, receipt, alreadyAwarded: false };
  });
  return result;
}
