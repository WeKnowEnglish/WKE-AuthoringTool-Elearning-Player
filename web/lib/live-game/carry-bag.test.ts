import { describe, expect, it } from "vitest";
import {
  appendCarrySlot,
  bagHasMatchingResource,
  countMatchingResourceSlots,
  getHeldVisual,
  normalizePlayerCarry,
  removeMatchingResourceSlots,
  setHeldSlotIndex,
} from "@/lib/live-game/carry-bag";

describe("carry-bag helpers", () => {
  it("normalizes legacy single-item carry into a bag", () => {
    const bag = normalizePlayerCarry(
      {
        resourceType: "wood",
        sourceNodeId: "tree-01",
        questionId: "q1",
        harvestedAt: 10,
      },
      1,
    );
    expect(bag?.slots[0]?.kind).toBe("resource");
    expect(getHeldVisual(bag)).toBe("wood");
  });

  it("appends up to capacity and dumps matching resources", () => {
    let bag = appendCarrySlot(
      null,
      {
        kind: "resource",
        resourceType: "wood",
        sourceNodeId: "t1",
        questionId: "q",
        harvestedAt: 1,
      },
      4,
    );
    bag = appendCarrySlot(
      bag,
      {
        kind: "resource",
        resourceType: "wood",
        sourceNodeId: "t2",
        questionId: "q",
        harvestedAt: 2,
      },
      4,
    );
    bag = appendCarrySlot(bag, { kind: "bread", craftedAt: 3 }, 4);
    expect(countMatchingResourceSlots(bag, "wood")).toBe(2);
    expect(bagHasMatchingResource(bag, "wood")).toBe(true);

    const dumped = removeMatchingResourceSlots(bag!, "wood");
    expect(dumped.removedCount).toBe(2);
    expect(dumped.bag?.slots.some((slot) => slot?.kind === "bread")).toBe(true);
    expect(getHeldVisual(dumped.bag)).toBe("bread");
  });

  it("sets held slot for eat targeting", () => {
    const bag = normalizePlayerCarry(
      {
        slots: [
          {
            kind: "resource",
            resourceType: "stone",
            sourceNodeId: "s1",
            questionId: "q",
            harvestedAt: 1,
          },
          { kind: "bread", craftedAt: 2 },
          null,
          null,
        ],
        heldSlotIndex: 0,
      },
      4,
    )!;
    const heldBread = setHeldSlotIndex(bag, 1);
    expect(getHeldVisual(heldBread)).toBe("bread");
  });
});
