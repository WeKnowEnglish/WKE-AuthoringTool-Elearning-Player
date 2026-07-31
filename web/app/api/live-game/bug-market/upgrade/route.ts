import { LiveMap, LiveObject } from "@liveblocks/client";
import { NextResponse } from "next/server";
import type { LiveGamePlayerPosition } from "@/lib/live-game/liveblocks/config";
import { BUG_MARKET_NET_LEVEL_2_COST, isNearBugMarketShop } from "@/lib/live-game/modes/bug-market/sale-rules";
import type { BugMarketPlayerState, BugMarketPurchaseReceipt } from "@/lib/live-game/modes/bug-market/state";
import { getLiveblocksServerClient } from "@/lib/live-game/server/liveblocks-client";
import { requireLiveGamePlayerSession } from "@/lib/live-game/server/player-session";
import { withLiveGameServerTiming } from "@/lib/live-game/server/server-timing";

export async function POST(request: Request) {
  return withLiveGameServerTiming("bug_market_upgrade", async (timer) => {
    try {
      const body = await request.json() as { roomId?: string; clientActionId?: string };
      if (!body.roomId || !body.clientActionId) return NextResponse.json({ error: "roomId and clientActionId are required." }, { status: 400 });
      const identity = await timer.measure("auth", () => requireLiveGamePlayerSession(body.roomId!));
      let result: { ok: true; receipt: BugMarketPurchaseReceipt; alreadyPurchased: boolean } | { ok: false; reason: string } = { ok: false, reason: "unavailable" };
      await timer.measure("liveblocks_mutate", () => getLiveblocksServerClient().mutateStorage(body.roomId!, ({ root }) => {
        const liveRoot = root as unknown as { get(key: string): unknown };
        const session = liveRoot.get("session") as LiveObject<{ modeId: string; phase: string }> | undefined;
        if (session?.get("modeId") !== "bug_market" || session.get("phase") !== "playing") { result = { ok: false, reason: "not_playing" }; return; }
        const players = liveRoot.get("bugMarketPlayers") as LiveMap<string, LiveObject<BugMarketPlayerState>> | undefined;
        const positions = liveRoot.get("playerPositions") as LiveMap<string, LiveObject<LiveGamePlayerPosition>> | undefined;
        const receipts = liveRoot.get("bugMarketPurchaseReceipts") as LiveMap<string, LiveObject<BugMarketPurchaseReceipt>> | undefined;
        const player = players?.get(identity.playerId); const position = positions?.get(identity.playerId);
        if (!player || !receipts) { result = { ok: false, reason: "player_not_found" }; return; }
        const prior = receipts.get(body.clientActionId!);
        if (prior) { result = { ok: true, alreadyPurchased: true, receipt: { clientActionId: prior.get("clientActionId"), playerId: prior.get("playerId"), itemId: prior.get("itemId"), coinsSpent: prior.get("coinsSpent"), coinBalance: prior.get("coinBalance"), purchasedAt: prior.get("purchasedAt") } }; return; }
        if (player.get("netLevel") >= 2) { result = { ok: false, reason: "already_owned" }; return; }
        const plainPosition = position ? { x: position.get("x"), y: position.get("y"), updatedAt: position.get("updatedAt") } : null;
        if (!isNearBugMarketShop(plainPosition)) { result = { ok: false, reason: "not_at_shop" }; return; }
        if (player.get("coins") < BUG_MARKET_NET_LEVEL_2_COST) { result = { ok: false, reason: "not_enough_coins" }; return; }
        const receipt: BugMarketPurchaseReceipt = { clientActionId: body.clientActionId!, playerId: identity.playerId, itemId: "net_level_2", coinsSpent: BUG_MARKET_NET_LEVEL_2_COST, coinBalance: player.get("coins") - BUG_MARKET_NET_LEVEL_2_COST, purchasedAt: Date.now() };
        player.set("coins", receipt.coinBalance); player.set("netLevel", 2); receipts.set(body.clientActionId!, new LiveObject(receipt));
        result = { ok: true, receipt, alreadyPurchased: false };
      }));
      return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: 409 });
    } catch (error) {
      if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") return NextResponse.json({ error: "Not authorized." }, { status: 401 });
      return NextResponse.json({ error: "Could not purchase the upgrade." }, { status: 503 });
    }
  });
}
