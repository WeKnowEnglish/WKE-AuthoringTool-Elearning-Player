import { describe, expect, it } from "vitest";
import {
  createInitialRuntime,
  markCorrect,
  markIncorrect,
  nextTurn,
  rollDice,
  skipQuestion,
} from "@/lib/board-game/game-engine";
import type { GameSetup } from "@/lib/board-game/types";

const setup: GameSetup = {
  schemaVersion: 1,
  playerCount: 2,
  players: [
    { id: "p1", name: "Alice", color: "#ef4444" },
    { id: "p2", name: "Bob", color: "#3b82f6" },
  ],
  boardPathStyle: "short",
  questions: [
    {
      id: "q1",
      type: "multiple_choice",
      prompt: "A or B?",
      options: ["A", "B", "C"],
      correctAnswer: "A",
    },
    {
      id: "q2",
      type: "fill_blank",
      sentence: "I ___ home.",
      correctAnswer: "go",
    },
  ],
};

describe("board game engine", () => {
  it("creates initial runtime with all players at start", () => {
    const runtime = createInitialRuntime(setup.players);
    expect(runtime.playerPositions).toEqual([0, 0]);
    expect(runtime.scores).toEqual([0, 0]);
    expect(runtime.turnPhase).toBe("roll");
    expect(runtime.winnerIndex).toBeNull();
  });

  it("rolls dice, moves pawn, and shows a question", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = rollDice(runtime, setup, () => 0);
    expect(runtime.lastDiceRoll).toBe(1);
    expect(runtime.playerPositions[0]).toBe(1);
    expect(runtime.currentQuestion).not.toBeNull();
    expect(runtime.turnPhase).toBe("question");
  });

  it("awards a point on correct answer", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = rollDice(runtime, setup, () => 0);
    runtime = markCorrect(runtime, setup);
    expect(runtime.scores[0]).toBe(1);
    expect(runtime.turnPhase).toBe("turnEnd");
  });

  it("does not award a point on incorrect answer", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = rollDice(runtime, setup, () => 0);
    runtime = markIncorrect(runtime, setup);
    expect(runtime.scores[0]).toBe(0);
    expect(runtime.turnPhase).toBe("turnEnd");
  });

  it("skip question does not change score", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = rollDice(runtime, setup, () => 0);
    runtime = skipQuestion(runtime, setup);
    expect(runtime.scores[0]).toBe(0);
    expect(runtime.turnPhase).toBe("turnEnd");
  });

  it("rotates turns", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = rollDice(runtime, setup, () => 0);
    runtime = markCorrect(runtime, setup);
    runtime = nextTurn(runtime, setup.playerCount);
    expect(runtime.currentPlayerIndex).toBe(1);
    expect(runtime.turnPhase).toBe("roll");
    expect(runtime.currentQuestion).toBeNull();
  });

  it("detects winner at finish line", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = {
      ...runtime,
      playerPositions: [11, 0],
    };
    runtime = rollDice(runtime, setup, () => 0.99);
    expect(runtime.lastDiceRoll).toBe(6);
    expect(runtime.playerPositions[0]).toBe(12);
    expect(runtime.winnerIndex).toBe(0);
  });
});
