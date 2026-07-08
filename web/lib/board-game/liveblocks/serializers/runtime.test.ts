import { describe, expect, it } from "vitest";
import { createInitialRuntime } from "@/lib/board-game/game-engine";
import {
  applyGameRuntimeToLiveObject,
  gameRuntimeFromStorage,
} from "@/lib/board-game/liveblocks/serializers/runtime";
import type { GameRuntime } from "@/lib/board-game/types";
import { LiveObject } from "@liveblocks/client";

const players = [
  { id: "p1", name: "Alice", color: "#ef4444" },
  { id: "p2", name: "Bob", color: "#3b82f6" },
];

describe("runtime serializer", () => {
  it("roundtrips runtime through a LiveObject", () => {
    const runtime = createInitialRuntime(players);
    runtime.scores = [2, 1];
    runtime.playerPositions = [4, 3];
    runtime.turnPhase = "question";
    runtime.currentQuestion = {
      id: "q1",
      type: "multiple_choice",
      prompt: "A?",
      options: ["A", "B", "C"],
      correctAnswer: "A",
    };

    const live = new LiveObject<GameRuntime>(runtime);
    applyGameRuntimeToLiveObject(live, {
      ...runtime,
      scores: [5, 4],
      playerPositions: [6, 5],
      turnPhase: "roll",
      currentQuestion: null,
      winnerIndex: 1,
    });

    const restored = gameRuntimeFromStorage(live);
    expect(restored).toEqual({
      ...runtime,
      scores: [5, 4],
      playerPositions: [6, 5],
      turnPhase: "roll",
      currentQuestion: null,
      winnerIndex: 1,
    });
  });
});
