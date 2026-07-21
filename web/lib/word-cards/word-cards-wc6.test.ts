import { describe, expect, it } from "vitest";
import {
  canPushGroupCardForReview,
  canSubmitWordCardAsUser,
  cardIdForUserInRound,
  planAssignWordCardsGroups,
} from "@/lib/word-cards/group-membership";
import { canPushCardForReview } from "@/lib/word-cards/review";
import { cardIdForGroup } from "@/lib/word-cards/domain";

describe("word cards groups (WC-6)", () => {
  it("plans active cards and orphans without wiping ids", () => {
    const plan = planAssignWordCardsGroups({
      incoming: {
        groups: [
          { id: "g1", name: "A", memberIds: ["s1", "s2"] },
          { id: "g2", name: "B", memberIds: ["s3"] },
        ],
      },
      existingGroupOwnerIds: ["g1", "g_old"],
    });
    expect(plan.groups).toHaveLength(2);
    expect(plan.activeCardIds).toEqual([cardIdForGroup("g1"), cardIdForGroup("g2")]);
    expect(plan.orphanOwnerIds).toEqual(["g_old"]);
  });

  it("rejects orphan group cards for Show/Compare", () => {
    expect(
      canPushCardForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g_old",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(false);
    expect(
      canPushGroupCardForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g1",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(true);
  });

  it("binds students to shared group card ids", () => {
    const groups = [
      { id: "g1", name: "A", memberIds: ["s1", "s2"], leaderId: "s1" },
    ];
    expect(
      cardIdForUserInRound({
        participationMode: "group",
        userId: "s2",
        groups,
      }),
    ).toBe(cardIdForGroup("g1"));
    expect(
      cardIdForUserInRound({
        participationMode: "individual",
        userId: "s2",
        groups: [],
      }),
    ).toBe("card:student:s2");
  });

  it("enforces group submit policy any_member", () => {
    const groups = [
      { id: "g1", name: "A", memberIds: ["s1", "s2"], leaderId: "s1" },
    ];
    expect(
      canSubmitWordCardAsUser({
        participationMode: "group",
        userId: "s2",
        cardOwnerType: "group",
        cardOwnerId: "g1",
        groups,
        policy: "any_member",
        readyMemberIds: [],
      }),
    ).toBe(true);
    expect(
      canSubmitWordCardAsUser({
        participationMode: "group",
        userId: "s2",
        cardOwnerType: "group",
        cardOwnerId: "g1",
        groups,
        policy: "leader_only",
        readyMemberIds: [],
      }),
    ).toBe(false);
    expect(
      canSubmitWordCardAsUser({
        participationMode: "group",
        userId: "s3",
        cardOwnerType: "group",
        cardOwnerId: "g1",
        groups,
        policy: "any_member",
        readyMemberIds: [],
      }),
    ).toBe(false);
  });
});
