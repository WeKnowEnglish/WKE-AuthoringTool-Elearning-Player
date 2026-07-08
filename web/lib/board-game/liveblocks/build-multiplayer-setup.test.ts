import { describe, expect, it } from "vitest";
import {
  buildMultiplayerSetup,
  canStartMultiplayerGame,
} from "@/lib/board-game/liveblocks/build-multiplayer-setup";
import { createEmptySetup } from "@/lib/board-game/question-utils";

describe("buildMultiplayerSetup", () => {
  it("builds setup from lobby students and stored config", () => {
    const setup = buildMultiplayerSetup({
      storedSetup: {
        ...createEmptySetup(2),
        mapId: "default-short",
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            prompt: "A?",
            options: ["A", "B", "C"],
            correctAnswer: "A",
          },
        ],
      },
      lobbyPlayers: [
        {
          id: "host-1",
          player: {
            name: "Teacher",
            color: "#ef4444",
            role: "host",
            isReady: true,
            joinedAt: 1,
          },
        },
        {
          id: "student-1",
          player: {
            name: "Mia",
            color: "#3b82f6",
            role: "player",
            isReady: true,
            joinedAt: 2,
          },
        },
        {
          id: "student-2",
          player: {
            name: "Leo",
            color: "#22c55e",
            role: "player",
            isReady: false,
            joinedAt: 3,
          },
        },
      ],
    });

    expect(setup).not.toBeNull();
    expect(setup?.players).toEqual([
      { id: "student-1", name: "Mia", color: "#3b82f6" },
      { id: "student-2", name: "Leo", color: "#22c55e" },
    ]);
    expect(setup?.mapId).toBe("default-short");
    expect(canStartMultiplayerGame(setup!)).toBe(true);
  });

  it("returns null when there are not enough students", () => {
    const setup = buildMultiplayerSetup({
      storedSetup: createEmptySetup(2),
      lobbyPlayers: [
        {
          id: "host-1",
          player: {
            name: "Teacher",
            color: "#ef4444",
            role: "host",
            isReady: true,
            joinedAt: 1,
          },
        },
      ],
    });

    expect(setup).toBeNull();
  });
});
