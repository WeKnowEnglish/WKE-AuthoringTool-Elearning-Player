import { describe, expect, it } from "vitest";
import { documentIdForGroup } from "@/lib/document-activity/domain";
import {
  documentIdForUserInRound,
  findGroupForUser,
  normalizeAssignPayload,
  planAssignGroups,
  sessionGroupsToDocumentAssign,
} from "@/lib/document-activity/group-membership";

describe("document group membership (chunk 4a)", () => {
  it("normalizes assign payload and drops empty groups", () => {
    const groups = normalizeAssignPayload({
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
    const plan = planAssignGroups({
      incoming: {
        groups: [{ id: "g2", name: "Red", memberIds: ["c"] }],
      },
      existingGroupOwnerIds: ["g1", "g2"],
    });
    expect(plan.groups.map((g) => g.id)).toEqual(["g2"]);
    expect(plan.activeDocumentIds).toEqual([documentIdForGroup("g2")]);
    expect(plan.orphanOwnerIds).toEqual(["g1"]);
  });

  it("resolves document id by participation mode", () => {
    const groups = normalizeAssignPayload({
      groups: [{ id: "g1", name: "Blue", memberIds: ["u1", "u2"], leaderId: "u1" }],
    });
    expect(
      documentIdForUserInRound({
        participationMode: "individual",
        userId: "u1",
        groups,
      }),
    ).toBe("document:student:u1");
    expect(
      documentIdForUserInRound({
        participationMode: "group",
        userId: "u2",
        groups,
      }),
    ).toBe("document:group:g1");
    expect(
      documentIdForUserInRound({
        participationMode: "group",
        userId: "u9",
        groups,
      }),
    ).toBeNull();
    expect(
      documentIdForUserInRound({
        participationMode: "whole_class",
        userId: "u1",
        groups: [],
      }),
    ).toBe("document:whole-class");
    expect(findGroupForUser(groups, "u1")?.name).toBe("Blue");
  });

  it("maps session groups into assign payload", () => {
    const assign = sessionGroupsToDocumentAssign([
      { id: "g1", name: "A", memberIds: ["1"], leaderId: "1" },
    ]);
    expect(assign.groups[0]?.memberIds).toEqual(["1"]);
  });
});
