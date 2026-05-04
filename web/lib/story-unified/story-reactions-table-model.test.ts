import { describe, expect, it } from "vitest";
import {
  buildAddReactionOptions,
  defaultAddReactionMode,
  triggerIcon,
} from "@/components/teacher/lesson-editor/story-reactions-table-model";

describe("story-reactions-table-model", () => {
  it("chooses item_click default when an item is selected", () => {
    expect(
      defaultAddReactionMode({
        selectedItemId: "shirt",
        selectedPhaseId: null,
        hasAnyItems: true,
        hasAnyPhases: true,
      }),
    ).toBe("item_click");
  });

  it("disables scoped options when context is missing", () => {
    const opts = buildAddReactionOptions({
      selectedItemId: null,
      hasAnyItems: false,
      hasAnyPhases: false,
      hasAnyTapGroupParent: false,
    });
    expect(opts.find((x) => x.id === "item_click")?.enabled).toBe(false);
    expect(opts.find((x) => x.id === "phase_start")?.enabled).toBe(false);
    expect(opts.find((x) => x.id === "item_pool")?.enabled).toBe(false);
  });

  it("returns compact trigger icons", () => {
    expect(triggerIcon("phase_enter")).toBe("Start");
    expect(triggerIcon("timer")).toBe("Timer");
    expect(triggerIcon("item_sequence_done")).toBe("Done");
  });
});
