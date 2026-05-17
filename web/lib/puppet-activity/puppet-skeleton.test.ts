import { describe, expect, it } from "vitest";
import { DEFAULT_PUPPET_SKELETON, skeletonPartOrder } from "./puppet-skeleton";
import { PUPPET_PART_KEYS } from "./types";

describe("puppet-skeleton", () => {
  it("orders parts depth-first with body root", () => {
    expect(skeletonPartOrder()).toEqual([
      "body",
      "head",
      "upperArm",
      "lowerArm",
      "hand",
    ]);
  });

  it("includes every rig part once", () => {
    const order = skeletonPartOrder(DEFAULT_PUPPET_SKELETON);
    expect(order.sort()).toEqual([...PUPPET_PART_KEYS].sort());
    expect(new Set(order).size).toBe(PUPPET_PART_KEYS.length);
  });
});
