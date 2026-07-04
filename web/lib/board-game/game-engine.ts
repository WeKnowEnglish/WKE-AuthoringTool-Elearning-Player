import { getSpaceAt } from "@/lib/board-game/board-spaces";
import { mapToRuntimeSpaces } from "@/lib/board-game/map/map-to-runtime";
import { boardLengthForSetup, resolveMapForSetup } from "@/lib/board-game/map/resolve-map";
import { pickQuestion } from "@/lib/board-game/question-utils";
import type {
  BoardSpaceMeta,
  GameRuntime,
  GameSetup,
  PenaltyType,
  Player,
  SpaceEffectType,
} from "@/lib/board-game/types";

export function createInitialRuntime(
  players: Player[],
  options?: { boardSpaces?: BoardSpaceMeta[]; enableLuckySpaces?: boolean },
): GameRuntime {
  const boardSpaces =
    options?.enableLuckySpaces === false ?
      []
    : (options?.boardSpaces ?? []);

  return {
    currentPlayerIndex: 0,
    playerPositions: players.map(() => 0),
    scores: players.map(() => 0),
    usedQuestionIds: [],
    currentQuestion: null,
    lastDiceRoll: null,
    turnPhase: "roll",
    winnerIndex: null,
    boardSpaces,
    checkpoints: players.map(() => 0),
    pendingMissTurn: players.map(() => false),
    pendingRollAgain: false,
  };
}

export function initRuntimeForSetup(setup: GameSetup, _random?: () => number): GameRuntime {
  const map = resolveMapForSetup(setup);
  const boardSpaces =
    setup.enableLuckySpaces === false ? [] : mapToRuntimeSpaces(map);
  return createInitialRuntime(setup.players, { boardSpaces });
}

export function restartGame(setup: GameSetup, random?: () => number): GameRuntime {
  return initRuntimeForSetup(setup, random);
}

function detectWinner(runtime: GameRuntime, boardLength: number): number | null {
  const index = runtime.playerPositions.findIndex((position) => position >= boardLength);
  return index >= 0 ? index : null;
}

function withTurnEnd(runtime: GameRuntime, boardLength: number): GameRuntime {
  return {
    ...runtime,
    turnPhase: "turnEnd",
    winnerIndex: runtime.winnerIndex ?? detectWinner(runtime, boardLength),
  };
}

function updateCheckpoint(runtime: GameRuntime, playerIndex: number, position: number): number[] {
  const checkpoints = [...runtime.checkpoints];
  if (position > 0 && position % 6 === 0) {
    checkpoints[playerIndex] = position;
  }
  return checkpoints;
}

export function computeDiceRoll(random: () => number = Math.random): number {
  return Math.floor(random() * 6) + 1;
}

export function applyForwardMove(
  runtime: GameRuntime,
  setup: GameSetup,
  steps: number,
): GameRuntime {
  const boardLength = boardLengthForSetup(setup);
  const playerIndex = runtime.currentPlayerIndex;
  const nextPosition = Math.min(
    runtime.playerPositions[playerIndex]! + steps,
    boardLength,
  );
  const nextPositions = [...runtime.playerPositions];
  nextPositions[playerIndex] = nextPosition;
  const checkpoints = updateCheckpoint(runtime, playerIndex, nextPosition);

  return {
    ...runtime,
    playerPositions: nextPositions,
    checkpoints,
    winnerIndex: detectWinner({ ...runtime, playerPositions: nextPositions }, boardLength),
  };
}

export function applyBackwardMove(
  runtime: GameRuntime,
  setup: GameSetup,
  steps: number,
): GameRuntime {
  const playerIndex = runtime.currentPlayerIndex;
  const nextPosition = Math.max(0, runtime.playerPositions[playerIndex]! - steps);
  const nextPositions = [...runtime.playerPositions];
  nextPositions[playerIndex] = nextPosition;

  return {
    ...runtime,
    playerPositions: nextPositions,
    winnerIndex: runtime.winnerIndex,
  };
}

export function attachQuestionAfterMove(
  runtime: GameRuntime,
  setup: GameSetup,
  dice: number,
  random: () => number = Math.random,
): GameRuntime {
  if (setup.questions.length === 0) return runtime;

  const { question, usedQuestionIds } = pickQuestion(
    setup.questions,
    runtime.usedQuestionIds,
    random,
  );

  return {
    ...runtime,
    usedQuestionIds,
    lastDiceRoll: dice,
    currentQuestion: question,
    turnPhase: "question",
  };
}

export function rollDice(
  runtime: GameRuntime,
  setup: GameSetup,
  random: () => number = Math.random,
): GameRuntime {
  if (runtime.turnPhase !== "roll") return runtime;
  if (setup.questions.length === 0) return runtime;

  const dice = computeDiceRoll(random);
  const afterMove = applyForwardMove(runtime, setup, dice);
  return attachQuestionAfterMove(afterMove, setup, dice, random);
}

export function markCorrect(runtime: GameRuntime, setup: GameSetup): GameRuntime {
  if (runtime.turnPhase !== "question") return runtime;

  const boardLength = boardLengthForSetup(setup);
  const playerIndex = runtime.currentPlayerIndex;
  const nextScores = [...runtime.scores];
  nextScores[playerIndex] = (nextScores[playerIndex] ?? 0) + 1;

  return withTurnEnd({ ...runtime, scores: nextScores }, boardLength);
}

export function markIncorrect(runtime: GameRuntime, setup: GameSetup): GameRuntime {
  if (runtime.turnPhase !== "question") return runtime;
  const boardLength = boardLengthForSetup(setup);
  return withTurnEnd(runtime, boardLength);
}

export function attachQuestionIfNeeded(
  runtime: GameRuntime,
  setup: GameSetup,
  dice: number,
  shouldAsk: boolean,
  random: () => number = Math.random,
): GameRuntime {
  if (shouldAsk) {
    return attachQuestionAfterMove(runtime, setup, dice, random);
  }
  return {
    ...runtime,
    lastDiceRoll: dice,
    turnPhase: "turnEnd",
    currentQuestion: null,
  };
}

export function markAnswerPhaseComplete(runtime: GameRuntime, setup: GameSetup): GameRuntime {
  const boardLength = boardLengthForSetup(setup);
  return withTurnEndPublic(runtime, boardLength);
}

function withTurnEndPublic(runtime: GameRuntime, boardLength: number): GameRuntime {
  return {
    ...runtime,
    turnPhase: "turnEnd",
    winnerIndex: runtime.winnerIndex ?? detectWinnerPublic(runtime, boardLength),
  };
}

function detectWinnerPublic(runtime: GameRuntime, boardLength: number): number | null {
  const index = runtime.playerPositions.findIndex((position) => position >= boardLength);
  return index >= 0 ? index : null;
}

export function skipQuestion(runtime: GameRuntime, setup: GameSetup): GameRuntime {
  if (runtime.turnPhase !== "question") return runtime;
  const boardLength = boardLengthForSetup(setup);
  return withTurnEnd(runtime, boardLength);
}

export function applyPenalty(
  runtime: GameRuntime,
  setup: GameSetup,
  penalty: PenaltyType,
): GameRuntime {
  const boardLength = boardLengthForSetup(setup);
  const playerIndex = runtime.currentPlayerIndex;
  let next = { ...runtime };

  switch (penalty) {
    case "back1":
      next = applyBackwardMove(next, setup, 1);
      break;
    case "back2":
      next = applyBackwardMove(next, setup, 2);
      break;
    case "losePoint": {
      const scores = [...next.scores];
      scores[playerIndex] = Math.max(0, (scores[playerIndex] ?? 0) - 1);
      next = { ...next, scores };
      break;
    }
    case "missTurn": {
      const pendingMissTurn = [...next.pendingMissTurn];
      pendingMissTurn[playerIndex] = true;
      next = { ...next, pendingMissTurn };
      break;
    }
    case "checkpoint": {
      const positions = [...next.playerPositions];
      positions[playerIndex] = next.checkpoints[playerIndex] ?? 0;
      next = { ...next, playerPositions: positions };
      break;
    }
    case "start": {
      const positions = [...next.playerPositions];
      positions[playerIndex] = 0;
      next = { ...next, playerPositions: positions };
      break;
    }
    case "rollAgain":
      next = { ...next, pendingRollAgain: true, turnPhase: "roll", currentQuestion: null, lastDiceRoll: null };
      return next;
    default:
      break;
  }

  next.winnerIndex = detectWinner(next, boardLength);
  return next;
}

function leaderIndex(runtime: GameRuntime): number {
  let best = 0;
  runtime.playerPositions.forEach((pos, index) => {
    if (pos > (runtime.playerPositions[best] ?? 0)) best = index;
  });
  return best;
}

export function applySpaceEffect(
  runtime: GameRuntime,
  setup: GameSetup,
  effect: SpaceEffectType,
): GameRuntime {
  const boardLength = boardLengthForSetup(setup);
  const playerIndex = runtime.currentPlayerIndex;
  let next = { ...runtime };

  switch (effect) {
    case "moveAhead3":
      next = applyForwardMove(next, setup, 3);
      break;
    case "moveBack2":
      next = applyBackwardMove(next, setup, 2);
      break;
    case "rollAgain":
      next = { ...next, pendingRollAgain: true };
      break;
    case "stealPoint": {
      const leader = leaderIndex(next);
      if (leader !== playerIndex && (next.scores[leader] ?? 0) > 0) {
        const scores = [...next.scores];
        scores[leader] = (scores[leader] ?? 0) - 1;
        scores[playerIndex] = (scores[playerIndex] ?? 0) + 1;
        next = { ...next, scores };
      }
      break;
    }
    case "skipTurn": {
      const pendingMissTurn = [...next.pendingMissTurn];
      pendingMissTurn[playerIndex] = true;
      next = { ...next, pendingMissTurn };
      break;
    }
    case "swapLeader": {
      const leader = leaderIndex(next);
      if (leader !== playerIndex) {
        const positions = [...next.playerPositions];
        const temp = positions[playerIndex]!;
        positions[playerIndex] = positions[leader]!;
        positions[leader] = temp;
        next = { ...next, playerPositions: positions };
      }
      break;
    }
    default:
      break;
  }

  next.winnerIndex = detectWinner(next, boardLength);
  return next;
}

export function resolveLuckySpace(
  runtime: GameRuntime,
  setup: GameSetup,
  position: number,
): { runtime: GameRuntime; space: BoardSpaceMeta | null } {
  const space = getSpaceAt(runtime.boardSpaces, position);
  if (!space || space.kind === "normal") {
    return { runtime, space: null };
  }
  return { runtime: applySpaceEffect(runtime, setup, space.effect), space };
}

export function nextTurn(runtime: GameRuntime, playerCount: number): GameRuntime {
  if (runtime.turnPhase !== "turnEnd" && !runtime.pendingRollAgain) return runtime;

  if (runtime.pendingRollAgain) {
    return {
      ...runtime,
      pendingRollAgain: false,
      currentQuestion: null,
      lastDiceRoll: null,
      turnPhase: "roll",
    };
  }

  let nextIndex = (runtime.currentPlayerIndex + 1) % playerCount;
  let attempts = 0;
  while (runtime.pendingMissTurn[nextIndex] && attempts < playerCount) {
    const pendingMissTurn = [...runtime.pendingMissTurn];
    pendingMissTurn[nextIndex] = false;
    runtime = { ...runtime, pendingMissTurn };
    nextIndex = (nextIndex + 1) % playerCount;
    attempts++;
  }

  return {
    ...runtime,
    currentPlayerIndex: nextIndex,
    currentQuestion: null,
    lastDiceRoll: null,
    turnPhase: "roll",
  };
}

export function getCurrentPlayer(setup: GameSetup, runtime: GameRuntime): Player {
  return setup.players[runtime.currentPlayerIndex]!;
}

export function questionLabel(question: import("@/lib/board-game/types").Question | null): string {
  if (!question) return "";
  if (question.type === "multiple_choice") return question.prompt;
  return question.sentence;
}

export function buildHopPath(from: number, to: number): number[] {
  if (to <= from) {
    const path: number[] = [];
    for (let i = from; i >= to; i--) path.push(i);
    return path.slice(1);
  }
  const path: number[] = [];
  for (let i = from + 1; i <= to; i++) path.push(i);
  return path;
}
