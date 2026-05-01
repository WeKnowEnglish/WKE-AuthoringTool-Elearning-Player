import { describe, expect, it } from "vitest";
import {
  getPresentationCheckTargetDraggables,
  isPresentationInteractionPassSatisfied,
} from "./presentation-interactive-pass";

const slide = (
  id: string,
  elements: Array<{
    id: string;
    draggable_mode?: "none" | "free" | "check_target";
    drop_target_id?: string;
  }>,
) => ({ id, elements });

describe("presentation-interactive-pass", () => {
  it("treats drag_targets_complete with no check_target elements as satisfied", () => {
    const slides = [slide("a", [{ id: "x", draggable_mode: "none" }])];
    expect(getPresentationCheckTargetDraggables(slides)).toHaveLength(0);
    expect(
      isPresentationInteractionPassSatisfied({
        pass_rule: "drag_targets_complete",
        slides,
        dragCheckDone: {},
        visitedSlides: { a: true },
      }),
    ).toBe(true);
  });

  it("requires every check_target draggable to be done for drag_targets_complete", () => {
    const slides = [
      slide("a", [
        { id: "d", draggable_mode: "check_target", drop_target_id: "t" },
        { id: "t", draggable_mode: "none" },
      ]),
    ];
    expect(
      isPresentationInteractionPassSatisfied({
        pass_rule: "drag_targets_complete",
        slides,
        dragCheckDone: {},
        visitedSlides: { a: true },
      }),
    ).toBe(false);
    expect(
      isPresentationInteractionPassSatisfied({
        pass_rule: "drag_targets_complete",
        slides,
        dragCheckDone: { d: true },
        visitedSlides: { a: true },
      }),
    ).toBe(true);
  });

  it("visit_all_slides requires every slide id in visitedSlides", () => {
    const slides = [slide("a", []), slide("b", [])];
    expect(
      isPresentationInteractionPassSatisfied({
        pass_rule: "visit_all_slides",
        slides,
        dragCheckDone: {},
        visitedSlides: { a: true },
      }),
    ).toBe(false);
    expect(
      isPresentationInteractionPassSatisfied({
        pass_rule: "visit_all_slides",
        slides,
        dragCheckDone: {},
        visitedSlides: { a: true, b: true },
      }),
    ).toBe(true);
  });

  it("visit_all_slides is false for empty slides list", () => {
    expect(
      isPresentationInteractionPassSatisfied({
        pass_rule: "visit_all_slides",
        slides: [],
        dragCheckDone: {},
        visitedSlides: {},
      }),
    ).toBe(false);
  });
});
