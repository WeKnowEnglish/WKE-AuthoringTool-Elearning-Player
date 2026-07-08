import { describe, expect, it } from "vitest";
import { createInitialRuntime } from "@/lib/board-game/game-engine";
import { assertValidRuntimeCommit } from "@/lib/board-game/presentation/assert-valid-runtime-commit";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

const sampleSetup: GameSetup = {
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
  ],
};

describe("assertValidRuntimeCommit", () => {
  it("accepts a valid initial runtime", () => {
    const runtime = createInitialRuntime(sampleSetup.players);
    expect(() => assertValidRuntimeCommit(runtime, sampleSetup)).not.toThrow();
  });

  it("rejects mismatched playerPositions length", () => {
    const runtime = createInitialRuntime(sampleSetup.players);
    runtime.playerPositions = [0];

    expect(() => assertValidRuntimeCommit(runtime, sampleSetup)).toThrow(/playerPositions length/);
  });

  it("rejects out-of-range currentPlayerIndex", () => {
    const runtime = createInitialRuntime(sampleSetup.players);
    runtime.currentPlayerIndex = 5;

    expect(() => assertValidRuntimeCommit(runtime, sampleSetup)).toThrow(/currentPlayerIndex/);
  });

  it("rejects out-of-range winnerIndex", () => {
    const runtime = createInitialRuntime(sampleSetup.players);
    runtime.winnerIndex = 3;

    expect(() => assertValidRuntimeCommit(runtime, sampleSetup)).toThrow(/winnerIndex/);
  });

  it('rejects question turn phase without a current question', () => {
    const runtime: GameRuntime = {
      ...createInitialRuntime(sampleSetup.players),
      turnPhase: "question",
      currentQuestion: null,
    };

    expect(() => assertValidRuntimeCommit(runtime, sampleSetup)).toThrow(/currentQuestion is null/);
  });

  it("rejects invalid turnPhase values", () => {
    const runtime = createInitialRuntime(sampleSetup.players);
    runtime.turnPhase = "invalid" as GameRuntime["turnPhase"];

    expect(() => assertValidRuntimeCommit(runtime, sampleSetup)).toThrow(/turnPhase/);
  });
});
