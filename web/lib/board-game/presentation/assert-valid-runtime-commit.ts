import type { GameRuntime, GameSetup, TurnPhase } from "@/lib/board-game/types";

const VALID_TURN_PHASES: TurnPhase[] = ["roll", "question", "turnEnd"];

export function assertValidRuntimeCommit(runtime: GameRuntime, setup: GameSetup): void {
  const { playerCount } = setup;

  if (runtime.playerPositions.length !== playerCount) {
    throw new Error(
      `Runtime playerPositions length (${runtime.playerPositions.length}) must match playerCount (${playerCount}).`,
    );
  }

  if (runtime.scores.length !== playerCount) {
    throw new Error(
      `Runtime scores length (${runtime.scores.length}) must match playerCount (${playerCount}).`,
    );
  }

  if (runtime.checkpoints.length !== playerCount) {
    throw new Error(
      `Runtime checkpoints length (${runtime.checkpoints.length}) must match playerCount (${playerCount}).`,
    );
  }

  if (runtime.pendingMissTurn.length !== playerCount) {
    throw new Error(
      `Runtime pendingMissTurn length (${runtime.pendingMissTurn.length}) must match playerCount (${playerCount}).`,
    );
  }

  if (runtime.currentPlayerIndex < 0 || runtime.currentPlayerIndex >= playerCount) {
    throw new Error(
      `Runtime currentPlayerIndex (${runtime.currentPlayerIndex}) is out of range for playerCount (${playerCount}).`,
    );
  }

  if (runtime.winnerIndex !== null && (runtime.winnerIndex < 0 || runtime.winnerIndex >= playerCount)) {
    throw new Error(
      `Runtime winnerIndex (${runtime.winnerIndex}) is out of range for playerCount (${playerCount}).`,
    );
  }

  if (!VALID_TURN_PHASES.includes(runtime.turnPhase)) {
    throw new Error(`Runtime turnPhase "${runtime.turnPhase}" is invalid.`);
  }

  if (runtime.turnPhase === "question" && runtime.currentQuestion === null) {
    throw new Error('Runtime turnPhase is "question" but currentQuestion is null.');
  }

  if (!runtime.usedQuestionIds.every((id) => typeof id === "string")) {
    throw new Error("Runtime usedQuestionIds must contain only strings.");
  }
}
