import { describe, expect, it } from "vitest";
import { createBugMarketPilotState, dispatchBugMarketPilotAction, moveBugMarketPilotPlayer, setBugMarketPilotConnection } from "@/lib/live-game/modes/bug-market/pilot-state";

describe("Bug Market in-memory pilot", () => {
  it("resolves two players against one shared bug collection", () => {
    let state = createBugMarketPilotState();
    state = moveBugMarketPilotPlayer(state, "aria", 260, 250);
    state = moveBugMarketPilotPlayer(state, "bao", 260, 250);
    state = dispatchBugMarketPilotAction(state, { id: "certain-catch-a", kind: "catch", playerId: "aria", bugId: "starter-ant-1" });
    state = dispatchBugMarketPilotAction(state, { id: "certain-catch-b", kind: "catch", playerId: "bao", bugId: "starter-ant-1" });
    expect(state.players.aria.inventory).toHaveLength(1);
    expect(state.players.bao.inventory).toHaveLength(0);
  });

  it("queues offline actions and resolves them on reconnect", () => {
    let state = createBugMarketPilotState();
    state = moveBugMarketPilotPlayer(state, "aria", 260, 250);
    state = setBugMarketPilotConnection(state, "aria", false);
    state = dispatchBugMarketPilotAction(state, { id: "offline-catch", kind: "catch", playerId: "aria", bugId: "starter-ant-1" });
    expect(state.queued.aria).toHaveLength(1);
    state = setBugMarketPilotConnection(state, "aria", true);
    expect(state.queued.aria).toHaveLength(0);
  });
});
