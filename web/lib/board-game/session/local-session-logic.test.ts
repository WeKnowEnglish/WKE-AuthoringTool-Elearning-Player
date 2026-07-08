import { describe, expect, it } from "vitest";
import {
  applyBackToSetup,
  applyClearSession,
  applyRestart,
  applyStartGame,
  createDefaultSessionState,
  hydrateFromStorage,
} from "@/lib/board-game/session/local-session-logic";
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

const sampleRuntime: GameRuntime = {
  currentPlayerIndex: 1,
  playerPositions: [3, 5],
  scores: [1, 2],
  usedQuestionIds: ["q1"],
  currentQuestion: null,
  lastDiceRoll: 4,
  turnPhase: "roll",
  winnerIndex: null,
  boardSpaces: [],
  checkpoints: [0, 6],
  pendingMissTurn: [false, false],
  pendingRollAgain: false,
};

describe("local session logic", () => {
  it("creates default session state with requested player count", () => {
    const state = createDefaultSessionState({ defaultPlayerCount: 4 });
    expect(state.gameStarted).toBe(false);
    expect(state.runtime).toBeNull();
    expect(state.setup.playerCount).toBe(4);
    expect(state.setup.players).toHaveLength(4);
    expect(state.setup.questions).toEqual([]);
  });

  it("hydrates with defaults when storage is empty", () => {
    const hydrated = hydrateFromStorage({
      readSetup: () => null,
      readRuntime: () => null,
    });

    expect(hydrated.gameStarted).toBe(false);
    expect(hydrated.runtime).toBeNull();
    expect(hydrated.shouldEnterPlay).toBe(false);
    expect(hydrated.setup.playerCount).toBe(3);
  });

  it("hydrates setup only when runtime is missing", () => {
    const hydrated = hydrateFromStorage({
      readSetup: () => sampleSetup,
      readRuntime: () => null,
    });

    expect(hydrated.setup).toEqual(sampleSetup);
    expect(hydrated.gameStarted).toBe(false);
    expect(hydrated.runtime).toBeNull();
    expect(hydrated.shouldEnterPlay).toBe(false);
  });

  it("ignores orphaned runtime when setup is missing", () => {
    const hydrated = hydrateFromStorage({
      readSetup: () => null,
      readRuntime: () => sampleRuntime,
    });

    expect(hydrated.gameStarted).toBe(false);
    expect(hydrated.runtime).toBeNull();
    expect(hydrated.shouldEnterPlay).toBe(false);
  });

  it("hydrates play state when setup and runtime exist", () => {
    const hydrated = hydrateFromStorage({
      readSetup: () => sampleSetup,
      readRuntime: () => sampleRuntime,
    });

    expect(hydrated.setup).toEqual(sampleSetup);
    expect(hydrated.runtime).toEqual(sampleRuntime);
    expect(hydrated.gameStarted).toBe(true);
    expect(hydrated.shouldEnterPlay).toBe(true);
  });

  it("starts a game from setup", () => {
    const started = applyStartGame(sampleSetup);
    expect(started.gameStarted).toBe(true);
    expect(started.runtime).not.toBeNull();
    expect(started.runtime?.turnPhase).toBe("roll");
    expect(started.runtime?.playerPositions).toEqual([0, 0]);
  });

  it("restarts a game with the same setup", () => {
    const restarted = applyRestart(sampleSetup);
    expect(restarted.runtime?.turnPhase).toBe("roll");
    expect(restarted.runtime?.playerPositions).toEqual([0, 0]);
    expect(restarted.runtime?.scores).toEqual([0, 0]);
  });

  it("returns to setup by clearing runtime state", () => {
    expect(applyBackToSetup()).toEqual({
      runtime: null,
      gameStarted: false,
    });
  });

  it("clears session back to empty defaults", () => {
    const cleared = applyClearSession(3);
    expect(cleared.gameStarted).toBe(false);
    expect(cleared.runtime).toBeNull();
    expect(cleared.setup.playerCount).toBe(3);
    expect(cleared.setup.questions).toEqual([]);
  });
});
