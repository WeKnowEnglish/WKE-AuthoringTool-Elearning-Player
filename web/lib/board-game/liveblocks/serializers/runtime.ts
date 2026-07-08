import { LiveObject } from "@liveblocks/client";
import type { GameRuntime } from "@/lib/board-game/types";

function readRuntimeFromLiveObject(live: LiveObject<GameRuntime>): GameRuntime {
  return {
    currentPlayerIndex: live.get("currentPlayerIndex"),
    playerPositions: [...live.get("playerPositions")],
    scores: [...live.get("scores")],
    usedQuestionIds: [...live.get("usedQuestionIds")],
    currentQuestion: live.get("currentQuestion"),
    lastDiceRoll: live.get("lastDiceRoll"),
    turnPhase: live.get("turnPhase"),
    winnerIndex: live.get("winnerIndex"),
    boardSpaces: [...live.get("boardSpaces")],
    checkpoints: [...live.get("checkpoints")],
    pendingMissTurn: [...live.get("pendingMissTurn")],
    pendingRollAgain: live.get("pendingRollAgain"),
  };
}

export function gameRuntimeFromStorage(live: unknown): GameRuntime | null {
  if (!live) return null;
  if (live instanceof LiveObject) {
    return readRuntimeFromLiveObject(live);
  }

  const runtime = live as GameRuntime;
  return {
    currentPlayerIndex: runtime.currentPlayerIndex,
    playerPositions: [...runtime.playerPositions],
    scores: [...runtime.scores],
    usedQuestionIds: [...runtime.usedQuestionIds],
    currentQuestion: runtime.currentQuestion,
    lastDiceRoll: runtime.lastDiceRoll,
    turnPhase: runtime.turnPhase,
    winnerIndex: runtime.winnerIndex,
    boardSpaces: [...runtime.boardSpaces],
    checkpoints: [...runtime.checkpoints],
    pendingMissTurn: [...runtime.pendingMissTurn],
    pendingRollAgain: runtime.pendingRollAgain,
  };
}

export function applyGameRuntimeToLiveObject(
  live: LiveObject<GameRuntime>,
  runtime: GameRuntime,
): void {
  live.set("currentPlayerIndex", runtime.currentPlayerIndex);
  live.set("playerPositions", [...runtime.playerPositions]);
  live.set("scores", [...runtime.scores]);
  live.set("usedQuestionIds", [...runtime.usedQuestionIds]);
  live.set("currentQuestion", runtime.currentQuestion);
  live.set("lastDiceRoll", runtime.lastDiceRoll);
  live.set("turnPhase", runtime.turnPhase);
  live.set("winnerIndex", runtime.winnerIndex);
  live.set("boardSpaces", [...runtime.boardSpaces]);
  live.set("checkpoints", [...runtime.checkpoints]);
  live.set("pendingMissTurn", [...runtime.pendingMissTurn]);
  live.set("pendingRollAgain", runtime.pendingRollAgain);
}
