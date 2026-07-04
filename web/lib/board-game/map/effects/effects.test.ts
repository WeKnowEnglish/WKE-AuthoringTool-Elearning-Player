import { describe, expect, it } from "vitest";
import { applyResolvedEffect } from "@/lib/board-game/map/effects/apply-map-effect";
import { resolveConnectionOnLand } from "@/lib/board-game/map/effects/connections";
import { feedbackForResolvedEffect } from "@/lib/board-game/map/effects/effect-copy";
import { shouldAskQuestion, hasLandEffect } from "@/lib/board-game/map/effects/landing-rules";
import {
  planLandingSequence,
  planCorrectAnswerSequence,
  planWrongAnswerSequence,
} from "@/lib/board-game/map/effects/landing-sequence";
import {
  defaultCorrectEffect,
  isEmptyEffect,
  penaltyTypeToResolved,
  resolveLandEffect,
  resolveWrongEffect,
  shortcutJumpEffect,
} from "@/lib/board-game/map/effects/resolve-effect";
import { addShortcutToMap } from "@/lib/board-game/map/map-enrich";
import { generateBoardMap } from "@/lib/board-game/map/generate-map";
import { getDefaultMapForPathStyle } from "@/lib/board-game/map/default-maps";
import { createInitialRuntime } from "@/lib/board-game/game-engine";
import type { GameSetup } from "@/lib/board-game/types";

const setup: GameSetup = {
  schemaVersion: 1,
  playerCount: 2,
  players: [
    { id: "p1", name: "Alice", color: "#ef4444" },
    { id: "p2", name: "Bob", color: "#3b82f6" },
  ],
  boardPathStyle: "short",
  mapId: "default-short",
  questions: [{ id: "q1", type: "fill_blank", sentence: "Hi", correctAnswer: "hi" }],
};

describe("map effect resolver", () => {
  it("maps effect types to resolved actions", () => {
    expect(resolveLandEffect({ type: "bonus", effect: "moveAhead3" })).toEqual({ moveSteps: 3 });
    expect(defaultCorrectEffect()).toEqual({ scoreDelta: 1 });
    expect(isEmptyEffect({})).toBe(true);
    expect(penaltyTypeToResolved("losePoint")).toEqual({ scoreDelta: -1 });
  });

  it("uses explicit onWrong from map space", () => {
    const effect = resolveWrongEffect(
      { type: "question", effects: { onWrong: "moveBack2" } },
      "back1",
    );
    expect(effect).toEqual({ moveSteps: -2 });
  });

  it("falls back to random penalty when no onWrong", () => {
    const effect = resolveWrongEffect({ type: "question" }, "missTurn");
    expect(effect).toEqual({ skipNextTurn: true });
  });
});

describe("landing rules", () => {
  it("skips questions on bonus squares with land effects", () => {
    const space = { id: 1, label: "Bonus", type: "bonus" as const, grid: { col: 0, row: 0 }, effect: "moveAhead3" as const };
    expect(hasLandEffect(space)).toBe(true);
    expect(shouldAskQuestion(space, 4, 12)).toBe(false);
  });

  it("asks questions on normal interior squares", () => {
    const space = { id: 1, label: "4", type: "question" as const, grid: { col: 0, row: 0 } };
    expect(shouldAskQuestion(space, 4, 12)).toBe(true);
  });
});

describe("landing sequence planning", () => {
  it("plans shortcut then question at destination", () => {
    let map = generateBoardMap({
      id: "test",
      title: "Test",
      layoutTemplate: "snake",
      boardLength: 12,
    });
    map = addShortcutToMap(map, 4, 9, "bridge");

    const steps = planLandingSequence(map, 4, 3);
    expect(steps[0]?.kind).toBe("shortcut");
    expect(steps.some((step) => step.kind === "question")).toBe(true);
  });

  it("resolves connection lookup by path index", () => {
    let map = generateBoardMap({
      id: "test2",
      title: "Test",
      layoutTemplate: "snake",
      boardLength: 10,
    });
    map = addShortcutToMap(map, 3, 8, "tunnel");
    const resolved = resolveConnectionOnLand(map, 3);
    expect(resolved?.destinationPathIndex).toBe(8);
  });
});

describe("applyResolvedEffect", () => {
  it("applies score and movement", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = applyResolvedEffect(runtime, setup, { scoreDelta: 2, moveSteps: 1 });
    expect(runtime.scores[0]).toBe(2);
    expect(runtime.playerPositions[0]).toBe(1);
  });

  it("applies shortcut jump to path index", () => {
    let runtime = createInitialRuntime(setup.players);
    runtime = applyResolvedEffect(runtime, setup, shortcutJumpEffect(5));
    expect(runtime.playerPositions[0]).toBe(5);
  });
});

describe("answer effect planning", () => {
  it("defaults correct answer to +1 point", () => {
    const map = getDefaultMapForPathStyle("short");
    const { effect } = planCorrectAnswerSequence(map, 3);
    expect(effect.scoreDelta).toBe(1);
  });

  it("provides feedback copy for shortcuts", () => {
    const feedback = feedbackForResolvedEffect(shortcutJumpEffect(9), { shortcutLabel: "Space 9" });
    expect(feedback.title).toBe("Shortcut!");
    expect(feedback.message).toContain("Space 9");
  });
});

describe("default long map shortcuts", () => {
  it("includes a bridge on default-long", () => {
    const map = getDefaultMapForPathStyle("long");
    expect(map.connections.length).toBeGreaterThan(0);
  });
});
