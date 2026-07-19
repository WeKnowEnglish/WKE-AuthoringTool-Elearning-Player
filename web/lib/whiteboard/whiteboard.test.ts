import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/whiteboard/state-machine";
import { canEditBoard } from "@/lib/whiteboard/permissions";
import { createIdleTimer } from "@/lib/whiteboard/domain";
import { startTimer, pauseTimer, resumeTimer, remainingMs } from "@/lib/whiteboard/timer";
import { simplifyStroke, strokeIntersectsPoint, elementIntersectsPoint } from "@/lib/whiteboard/stroke-simplification";
import { clientToLogical } from "@/lib/whiteboard/coordinates";
import { submissionIdempotencyKey } from "@/lib/whiteboard/domain";

describe("whiteboard state machine", () => {
  it("allows OPEN from WAITING", () => {
    expect(canTransition("WAITING", "OPEN")).toBe(true);
  });

  it("rejects OPEN from ENDED", () => {
    expect(canTransition("ENDED", "OPEN")).toBe(false);
  });
});

describe("whiteboard permissions", () => {
  const timer = startTimer(createIdleTimer(60_000), 60_000, 1_000);

  it("allows owner edit when OPEN and ACTIVE", () => {
    expect(
      canEditBoard({
        phase: "OPEN",
        boardStatus: "ACTIVE",
        timer,
        nowMs: 2_000,
        userId: "s1",
        role: "player",
        boardOwnerType: "student",
        boardOwnerId: "s1",
      }),
    ).toBe(true);
  });

  it("blocks edit when submitted", () => {
    expect(
      canEditBoard({
        phase: "OPEN",
        boardStatus: "SUBMITTED",
        timer,
        nowMs: 2_000,
        userId: "s1",
        role: "player",
        boardOwnerType: "student",
        boardOwnerId: "s1",
      }),
    ).toBe(false);
  });

  it("blocks other students", () => {
    expect(
      canEditBoard({
        phase: "OPEN",
        boardStatus: "ACTIVE",
        timer,
        nowMs: 2_000,
        userId: "s2",
        role: "player",
        boardOwnerType: "student",
        boardOwnerId: "s1",
      }),
    ).toBe(false);
  });
});

describe("timer", () => {
  it("accounts for pause", () => {
    let t = startTimer(createIdleTimer(10_000), 10_000, 0);
    t = pauseTimer(t, 3_000);
    expect(remainingMs(t, 3_000)).toBe(7_000);
    t = resumeTimer(t, 8_000);
    expect(remainingMs(t, 10_000)).toBe(5_000);
  });
});

describe("stroke simplification", () => {
  it("drops near duplicates", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 10, y: 0 },
    ];
    const simplified = simplifyStroke(points);
    expect(simplified.length).toBeLessThan(points.length);
    expect(simplified[0]).toMatchObject({ x: 0, y: 0 });
    expect(simplified.at(-1)).toMatchObject({ x: 10, y: 0 });
  });

  it("hit-tests stroke eraser", () => {
    const stroke = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(strokeIntersectsPoint(stroke, { x: 50, y: 2 }, 4)).toBe(true);
    expect(strokeIntersectsPoint(stroke, { x: 50, y: 80 }, 4)).toBe(false);
  });

  it("hit-tests shapes and stamps", () => {
    expect(
      elementIntersectsPoint(
        {
          id: "r1",
          type: "shape",
          shape: "rect",
          x: 10,
          y: 10,
          width: 40,
          height: 40,
          stroke: "#000",
          strokeWidth: 2,
          fill: "none",
          opacity: 1,
          createdBy: "u",
          createdAt: 1,
        },
        { x: 20, y: 20 },
      ),
    ).toBe(true);
  });
});

describe("coordinates", () => {
  it("maps client coords into logical board", () => {
    const rect = { left: 0, top: 0, width: 800, height: 450 } as DOMRect;
    const p = clientToLogical(400, 225, rect);
    expect(p.x).toBe(800);
    expect(p.y).toBe(450);
  });
});

describe("submission key", () => {
  it("is deterministic", () => {
    expect(submissionIdempotencyKey("r1", "b1", 2)).toBe("r1:b1:2");
  });
});
