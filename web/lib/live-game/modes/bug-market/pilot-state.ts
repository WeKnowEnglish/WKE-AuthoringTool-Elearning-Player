import { BUG_MARKET_NET_LEVEL_2_COST, bugMarketCoinsForRarity, bugMarketNetRangePx, isNearBugMarketShop } from "@/lib/live-game/modes/bug-market/sale-rules";
import { doesBugMarketCatchSucceed } from "@/lib/live-game/modes/bug-market/catch-rules";
import { BUG_MARKET_STARTER_BUGS, type BugMarketInventoryItem, type BugMarketWorldBug } from "@/lib/live-game/modes/bug-market/state";

export type BugMarketPilotPlayer = {
  id: string; name: string; avatarId: string; x: number; y: number;
  connected: boolean; coins: number; netLevel: number; inventory: BugMarketInventoryItem[];
};

export type BugMarketPilotAction =
  | { id: string; kind: "catch"; playerId: string; bugId: string }
  | { id: string; kind: "sell"; playerId: string; inventoryItemId: string; answerCorrect: boolean }
  | { id: string; kind: "upgrade"; playerId: string };

export type BugMarketPilotState = {
  players: Record<string, BugMarketPilotPlayer>;
  bugs: Record<string, BugMarketWorldBug>;
  queued: Record<string, BugMarketPilotAction[]>;
  log: string[];
};

export function createBugMarketPilotState(): BugMarketPilotState {
  return {
    players: {
      aria: { id: "aria", name: "Aria", avatarId: "girl-1", x: 520, y: 560, connected: true, coins: 0, netLevel: 1, inventory: [] },
      bao: { id: "bao", name: "Bao", avatarId: "boy-1", x: 680, y: 560, connected: true, coins: 0, netLevel: 1, inventory: [] },
    },
    bugs: Object.fromEntries(BUG_MARKET_STARTER_BUGS.map((bug) => [bug.id, { ...bug }])),
    queued: { aria: [], bao: [] },
    log: ["In-memory meadow ready. No Liveblocks room created."],
  };
}

function appendLog(state: BugMarketPilotState, message: string): BugMarketPilotState {
  return { ...state, log: [message, ...state.log].slice(0, 8) };
}

export function moveBugMarketPilotPlayer(state: BugMarketPilotState, playerId: string, x: number, y: number): BugMarketPilotState {
  const player = state.players[playerId];
  if (!player) return state;
  return { ...state, players: { ...state.players, [playerId]: { ...player, x, y } } };
}

export function dispatchBugMarketPilotAction(state: BugMarketPilotState, action: BugMarketPilotAction): BugMarketPilotState {
  const player = state.players[action.playerId];
  if (!player) return state;
  if (!player.connected) {
    return appendLog({ ...state, queued: { ...state.queued, [player.id]: [...(state.queued[player.id] ?? []), action] } }, `${player.name} queued ${action.kind} while offline.`);
  }
  if (action.kind === "catch") {
    const bug = state.bugs[action.bugId];
    if (!bug || bug.state !== "available") return appendLog(state, `${player.name}'s catch lost the race: bug unavailable.`);
    if (Math.hypot(bug.x - player.x, bug.y - player.y) > bugMarketNetRangePx(player.netLevel)) return appendLog(state, `${player.name} is too far from that bug.`);
    if (!doesBugMarketCatchSucceed({ clientActionId: action.id, bug })) return appendLog(state, `${bug.speciesId} escaped ${player.name}'s net.`);
    const item: BugMarketInventoryItem = { id: `caught:${action.id}`, speciesId: bug.speciesId, rarity: bug.rarity, caughtAt: Date.now() };
    return appendLog({
      ...state,
      bugs: { ...state.bugs, [bug.id]: { ...bug, state: "caught", claimedBy: player.id, claimedAt: Date.now() } },
      players: { ...state.players, [player.id]: { ...player, inventory: [...player.inventory, item] } },
    }, `${player.name} caught the ${bug.speciesId}.`);
  }
  if (action.kind === "upgrade") {
    if (player.netLevel >= 2) return appendLog(state, `${player.name} already owns the long net.`);
    if (!isNearBugMarketShop({ x: player.x, y: player.y, updatedAt: Date.now() })) return appendLog(state, `${player.name} must walk to the upgrade shop.`);
    if (player.coins < BUG_MARKET_NET_LEVEL_2_COST) return appendLog(state, `${player.name} needs ${BUG_MARKET_NET_LEVEL_2_COST} coins for the long net.`);
    return appendLog({ ...state, players: { ...state.players, [player.id]: { ...player, coins: player.coins - BUG_MARKET_NET_LEVEL_2_COST, netLevel: 2 } } }, `${player.name} bought the long net.`);
  }
  if (!action.answerCorrect) return appendLog(state, `${player.name} answered incorrectly; the bug stays in the case.`);
  const item = player.inventory.find((entry) => entry.id === action.inventoryItemId);
  if (!item) return appendLog(state, `${player.name}'s sale could not replay: bug not owned.`);
  const coins = bugMarketCoinsForRarity(item.rarity);
  return appendLog({
    ...state,
    players: { ...state.players, [player.id]: { ...player, coins: player.coins + coins, inventory: player.inventory.filter((entry) => entry.id !== item.id) } },
  }, `${player.name} sold ${item.speciesId} for ${coins} coins.`);
}

export function setBugMarketPilotConnection(state: BugMarketPilotState, playerId: string, connected: boolean): BugMarketPilotState {
  const player = state.players[playerId];
  if (!player) return state;
  let next = appendLog({ ...state, players: { ...state.players, [playerId]: { ...player, connected } } }, `${player.name} is ${connected ? "online" : "offline"}.`);
  if (connected) {
    const queued = next.queued[playerId] ?? [];
    next = { ...next, queued: { ...next.queued, [playerId]: [] } };
    for (const action of queued) next = dispatchBugMarketPilotAction(next, action);
  }
  return next;
}
