import { describe, expect, it } from "vitest";
import { DEFAULT_PUPPET_SKELETON } from "./puppet-skeleton";
import {
  attachPartToActiveParent,
  defaultSkeletonParentMap,
  isRoot,
  parentMapToEdges,
  setBoneParent,
  skeletonFromParentMap,
  skeletonToParentMap,
  validateParentMap,
} from "./puppet-skeleton-utils";

describe("puppet-skeleton-utils", () => {
  it("round-trips default skeleton", () => {
    const map = defaultSkeletonParentMap();
    expect(validateParentMap(map).ok).toBe(true);
    const tree = skeletonFromParentMap(map);
    expect(tree?.part).toBe("body");
    expect(tree?.children?.map((c) => c.part).sort()).toEqual(["head", "upperArm"]);
  });

  it("attachPartToActiveParent links head under body without reparenting root", () => {
    const map: ReturnType<typeof defaultSkeletonParentMap> = {
      body: null,
      head: null,
      upperArm: null,
      lowerArm: null,
      hand: null,
    };

    const linked = attachPartToActiveParent(map, "head", "body");
    expect(linked.head).toBe("body");
    expect(isRoot(linked, "body")).toBe(true);

    const reselectBody = attachPartToActiveParent(linked, "body", "head");
    expect(isRoot(reselectBody, "body")).toBe(true);
    expect(reselectBody.head).toBe("body");
  });

  it("parentMapToEdges lists parent-child links", () => {
    const map = defaultSkeletonParentMap();
    const edges = parentMapToEdges(map);
    expect(edges.some((e) => e.parent === "body" && e.child === "head")).toBe(true);
    expect(edges.some((e) => e.parent === "upperArm" && e.child === "lowerArm")).toBe(true);
  });

  it("rejects cycles", () => {
    const map = skeletonToParentMap(DEFAULT_PUPPET_SKELETON);
    const cycled = setBoneParent(map, "body", "head");
    expect(cycled.body).toBe(map.body);
  });
});
