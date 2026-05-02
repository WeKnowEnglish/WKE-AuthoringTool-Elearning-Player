import { describe, expect, it } from "vitest";
import { getStoryCheckTargetDraggables, isStoryPassSatisfied } from "@/lib/story-pass";

describe("story-pass", () => {
  const pages = [
    {
      id: "p1",
      items: [
        { id: "a", draggable_mode: "check_target" as const, drop_target_id: "t" },
        { id: "t", draggable_mode: "none" as const },
      ],
    },
  ];

  it("drag_targets_complete passes when all check_target items are done", () => {
    expect(
      isStoryPassSatisfied({
        pass_rule: "drag_targets_complete",
        pages,
        dragCheckDone: { a: true },
        visitedPageIds: {},
      }),
    ).toBe(true);
  });

  it("drag_targets_complete passes when there are no check_target items", () => {
    expect(
      isStoryPassSatisfied({
        pass_rule: "drag_targets_complete",
        pages: [{ id: "p1", items: [{ id: "x", draggable_mode: "none" }] }],
        dragCheckDone: {},
        visitedPageIds: {},
      }),
    ).toBe(true);
  });

  it("visit_all_pages requires every page visited", () => {
    expect(
      isStoryPassSatisfied({
        pass_rule: "visit_all_pages",
        pages: [
          { id: "a", items: [] },
          { id: "b", items: [] },
        ],
        dragCheckDone: {},
        visitedPageIds: { a: true },
      }),
    ).toBe(false);
    expect(
      isStoryPassSatisfied({
        pass_rule: "visit_all_pages",
        pages: [
          { id: "a", items: [] },
          { id: "b", items: [] },
        ],
        dragCheckDone: {},
        visitedPageIds: { a: true, b: true },
      }),
    ).toBe(true);
  });

  it("getStoryCheckTargetDraggables lists check_target items with drop_target_id", () => {
    expect(getStoryCheckTargetDraggables(pages)).toHaveLength(1);
    expect(getStoryCheckTargetDraggables(pages)[0]?.id).toBe("a");
  });
});
