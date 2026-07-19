import { describe, expect, it } from "vitest";
import { boardIdForScope } from "@/lib/whiteboard/domain";
import {
  canPushBoardForReview,
  normalizeWhiteboardAssignPayload,
  planAssignWhiteboardGroups,
} from "@/lib/whiteboard/group-membership";

describe("whiteboard group orphan-and-lock (WB-3)", () => {
  it("normalizes assign payload and drops empty groups", () => {
    const groups = normalizeWhiteboardAssignPayload({
      groups: [
        { id: "g1", name: "Blue", memberIds: ["a", "a", "b"], leaderId: "z" },
        { id: "g2", name: "Empty", memberIds: [] },
      ],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.memberIds).toEqual(["a", "b"]);
    expect(groups[0]?.leaderId).toBe("a");
  });

  it("plans orphan-and-lock for removed groups", () => {
    const plan = planAssignWhiteboardGroups({
      incoming: {
        groups: [{ id: "g2", name: "Red", memberIds: ["c"] }],
      },
      existingGroupOwnerIds: ["g1", "g2"],
    });
    expect(plan.groups.map((g) => g.id)).toEqual(["g2"]);
    expect(plan.activeBoardIds).toEqual([boardIdForScope({ type: "group", groupId: "g2" })]);
    expect(plan.orphanOwnerIds).toEqual(["g1"]);
  });

  it("blocks Show/Compare push for orphaned group boards", () => {
    expect(
      canPushBoardForReview({
        status: "LOCKED",
        ownerType: "group",
        ownerId: "g-old",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(false);
    expect(
      canPushBoardForReview({
        status: "ACTIVE",
        ownerType: "group",
        ownerId: "g1",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(true);
    expect(
      canPushBoardForReview({
        status: "ACTIVE",
        ownerType: "student",
        ownerId: "u1",
        activeGroupIds: ["g1"],
      }),
    ).toBe(true);
  });
});
