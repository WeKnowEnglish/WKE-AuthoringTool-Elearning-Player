import {
  applyBackwardMove,
  applyForwardMove,
} from "@/lib/board-game/game-engine";
import { boardLengthForSetup } from "@/lib/board-game/map/resolve-map";
import type { ResolvedEffect } from "@/lib/board-game/map/effects/resolve-effect";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

function detectWinner(runtime: GameRuntime, boardLength: number): number | null {
  const index = runtime.playerPositions.findIndex((position) => position >= boardLength);
  return index >= 0 ? index : null;
}

function leaderIndex(runtime: GameRuntime): number {
  let best = 0;
  runtime.playerPositions.forEach((pos, index) => {
    if (pos > (runtime.playerPositions[best] ?? 0)) best = index;
  });
  return best;
}

/** Apply a resolved map effect using existing engine movement/score helpers. */
export function applyResolvedEffect(
  runtime: GameRuntime,
  setup: GameSetup,
  effect: ResolvedEffect,
): GameRuntime {
  const boardLength = boardLengthForSetup(setup);
  const playerIndex = runtime.currentPlayerIndex;
  let next: GameRuntime = { ...runtime };

  if (effect.scoreDelta) {
    const scores = [...next.scores];
    scores[playerIndex] = Math.max(0, (scores[playerIndex] ?? 0) + effect.scoreDelta);
    next = { ...next, scores };
  }

  if (effect.moveSteps && effect.moveSteps > 0) {
    next = applyForwardMove(next, setup, effect.moveSteps);
  } else if (effect.moveSteps && effect.moveSteps < 0) {
    next = applyBackwardMove(next, setup, Math.abs(effect.moveSteps));
  }

  if (effect.goToPathIndex !== undefined) {
    const positions = [...next.playerPositions];
    positions[playerIndex] = Math.min(boardLength, Math.max(0, effect.goToPathIndex));
    next = {
      ...next,
      playerPositions: positions,
      winnerIndex: detectWinner({ ...next, playerPositions: positions }, boardLength),
    };
  }

  if (effect.goToStart) {
    const positions = [...next.playerPositions];
    positions[playerIndex] = 0;
    next = { ...next, playerPositions: positions, winnerIndex: detectWinner(next, boardLength) };
  }

  if (effect.goToCheckpoint) {
    const positions = [...next.playerPositions];
    positions[playerIndex] = next.checkpoints[playerIndex] ?? 0;
    next = { ...next, playerPositions: positions, winnerIndex: detectWinner(next, boardLength) };
  }

  if (effect.stealPointFromLeader) {
    const leader = leaderIndex(next);
    if (leader !== playerIndex && (next.scores[leader] ?? 0) > 0) {
      const scores = [...next.scores];
      scores[leader] = (scores[leader] ?? 0) - 1;
      scores[playerIndex] = (scores[playerIndex] ?? 0) + 1;
      next = { ...next, scores };
    }
  }

  if (effect.swapWithLeader) {
    const leader = leaderIndex(next);
    if (leader !== playerIndex) {
      const positions = [...next.playerPositions];
      const temp = positions[playerIndex]!;
      positions[playerIndex] = positions[leader]!;
      positions[leader] = temp;
      next = {
        ...next,
        playerPositions: positions,
        winnerIndex: detectWinner({ ...next, playerPositions: positions }, boardLength),
      };
    }
  }

  if (effect.skipNextTurn) {
    const pendingMissTurn = [...next.pendingMissTurn];
    pendingMissTurn[playerIndex] = true;
    next = { ...next, pendingMissTurn };
  }

  if (effect.rollAgain) {
    next = {
      ...next,
      pendingRollAgain: true,
      turnPhase: "roll",
      currentQuestion: null,
      lastDiceRoll: null,
    };
  }

  next.winnerIndex = next.winnerIndex ?? detectWinner(next, boardLength);
  return next;
}

export function effectRequiresMovement(
  runtime: GameRuntime,
  nextRuntime: GameRuntime,
  playerIndex: number = runtime.currentPlayerIndex,
): boolean {
  return (
    (nextRuntime.playerPositions[playerIndex] ?? 0) !== (runtime.playerPositions[playerIndex] ?? 0)
  );
}
