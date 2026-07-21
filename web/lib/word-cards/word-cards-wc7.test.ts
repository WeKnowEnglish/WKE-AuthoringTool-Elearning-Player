import { describe, expect, it } from "vitest";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { WORD_CARDS_INTERACTION_CONFIG } from "@/lib/activity-runtime/activity-interaction-config";
import {
  getVcActivity,
  listEnabledVcActivities,
} from "@/lib/activity-runtime/registry";
import {
  cardIdForGroup,
  cardIdForStudent,
  DEFAULT_WORD_CARDS_SETTINGS,
  isInClassDeck,
  isInClassPile,
} from "@/lib/word-cards/domain";
import {
  canSubmitWordCardAsUser,
  cardIdForUserInRound,
  planAssignWordCardsGroups,
} from "@/lib/word-cards/group-membership";
import {
  buildDefinitionRaceChoiceWords,
  buildPlayItem,
  canStartDefinitionRace,
  listApprovedPlayableCards,
  pickNextPromptCard,
  playChoiceDisplayOrder,
  type ApprovedDeckCard,
} from "@/lib/word-cards/play";
import {
  canPushCardForReview,
  createWordCardsCompareReview,
  createWordCardsShowReview,
  revealReviewResults,
  submitSharedReviewResponse,
} from "@/lib/word-cards/review";

/**
 * WC-7 — cross-chunk regression after create / moderate / review / play / groups.
 * Individual + group smoke paths must stay green (unit level).
 */
describe("word cards WC-7 regression (individual + group)", () => {
  it("registers word_cards as an enabled VC activity with interaction config", () => {
    const wc = getVcActivity("word_cards");
    expect(wc?.enabled).toBe(true);
    expect(WORD_CARDS_INTERACTION_CONFIG.pushToStudent).toBe(true);
    expect(WORD_CARDS_INTERACTION_CONFIG.allowRevision).toBe(true);
    expect(WORD_CARDS_INTERACTION_CONFIG.anonymousReview).toBe(true);
    expect(WORD_CARDS_INTERACTION_CONFIG.reviewModes).toEqual(
      expect.arrayContaining(["show", "compare"]),
    );
    expect(listEnabledVcActivities().some((a) => a.kind === "word_cards")).toBe(true);
  });

  it("keeps shared classroom control labels for the smoke path", () => {
    expect(teacherControlLabel("OPEN")).toBe("Open");
    expect(teacherControlLabel("COLLECT")).toBe("Collect");
    expect(teacherControlLabel("RETURN")).toBe("Return");
    expect(teacherControlLabel("REVISE")).toBe("Revise");
    expect(teacherControlLabel("APPROVE_CARD")).toBe("Approve");
    expect(teacherControlLabel("SHOW")).toBe("Show");
    expect(teacherControlLabel("COMPARE")).toBe("Compare");
    expect(teacherControlLabel("REVEAL_RESULTS")).toBe("Reveal results");
    expect(teacherControlLabel("START_PLAY")).toBe("Start race");
    expect(teacherControlLabel("LOCK_PLAY_ANSWERS")).toBe("Lock answers");
    expect(teacherControlLabel("REVEAL_PLAY_RESULTS")).toBe("Reveal");
    expect(teacherControlLabel("END_PLAY")).toBe("End play");
    expect(teacherControlLabel("COMPLETE")).toBe("Complete");
  });

  it("individual: create → collect → revise edit gates and labels", () => {
    expect(cardIdForStudent("u1")).toBe("card:student:u1");
    expect(
      canEditActivityWork({
        phase: "active",
        workStatus: "active",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);
    expect(
      canSubmitActivityWork({
        phase: "active",
        workStatus: "active",
        isOwner: true,
      }),
    ).toBe(true);
    expect(
      canEditActivityWork({
        phase: "collected",
        workStatus: "returned",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(false);
    expect(
      canEditActivityWork({
        phase: "revision",
        workStatus: "revising",
        role: "player",
        isOwner: true,
        hasReviewPush: false,
      }),
    ).toBe(true);

    expect(
      studentFacingState({
        phase: "active",
        workStatus: "active",
        hasReviewPush: false,
      }),
    ).toBe("Active");
    expect(
      studentFacingState({
        phase: "active",
        workStatus: "submitted",
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
    expect(
      studentFacingState({
        phase: "collected",
        workStatus: "locked",
        hasReviewPush: false,
      }),
    ).toBe("Class review");
    expect(
      studentFacingState({
        phase: "revision",
        workStatus: "revising",
        hasReviewPush: false,
      }),
    ).toBe("Revision");
  });

  it("individual: pile → deck → play fairness (≥4 approved)", () => {
    expect(isInClassPile("pending")).toBe(true);
    expect(isInClassDeck("pending")).toBe(false);
    expect(isInClassDeck("approved")).toBe(true);

    const deck: ApprovedDeckCard[] = [
      { id: "c1", assignedWord: "apple", definition: "A fruit.", moderation: "approved" },
      { id: "c2", assignedWord: "banana", definition: "Yellow fruit.", moderation: "approved" },
      { id: "c3", assignedWord: "cherry", definition: "Small fruit.", moderation: "approved" },
      { id: "c4", assignedWord: "date", definition: "Sweet fruit.", moderation: "approved" },
      { id: "c5", assignedWord: "empty", definition: "", moderation: "approved" },
    ];
    const playable = listApprovedPlayableCards(deck);
    expect(playable).toHaveLength(4);
    expect(canStartDefinitionRace(playable.length)).toBe(true);
    expect(DEFAULT_WORD_CARDS_SETTINGS.minDeckSizeForPlay).toBe(4);

    const first = pickNextPromptCard(playable, [])!;
    const play = buildPlayItem({
      card: first,
      approvedPlayable: playable,
      itemIndex: 0,
      usedCardIds: [],
    });
    expect(play.choiceWords).toContain(play.correctWord);
    expect(
      buildDefinitionRaceChoiceWords(playable, first.assignedWord),
    ).toContain(first.assignedWord);

    const a = playChoiceDisplayOrder({
      choiceWords: play.choiceWords,
      userId: "stu_a",
      promptCardId: play.promptCardId,
      itemIndex: 0,
    });
    const a2 = playChoiceDisplayOrder({
      choiceWords: play.choiceWords,
      userId: "stu_a",
      promptCardId: play.promptCardId,
      itemIndex: 0,
    });
    expect(a).toEqual(a2);
  });

  it("individual: Show/Compare → submit review → reveal", () => {
    expect(
      canPushCardForReview({
        status: "locked",
        ownerType: "student",
        ownerId: "u1",
      }),
    ).toBe(true);

    let review = createWordCardsShowReview({
      cardId: "card:student:u1",
      anonymous: false,
      taskType: "notice",
    });
    review = submitSharedReviewResponse(review, {
      studentId: "s1",
      note: "Clear definition.",
    });
    expect(review.responsesByStudentId.s1?.note).toContain("Clear");
    review = revealReviewResults(review);
    expect(review.status).toBe("results");

    const compare = createWordCardsCompareReview({
      cardIds: ["card:student:u1", "card:student:u2"],
      anonymous: true,
    });
    expect(compare.mode).toBe("compare");
    expect(compare.anonymous).toBe(true);

    expect(
      studentFacingState({
        phase: "collected",
        workStatus: "locked",
        hasReviewPush: true,
      }),
    ).toBe("Class review");
  });

  it("individual: complete + play student labels", () => {
    expect(
      studentFacingState({
        phase: "completed",
        workStatus: "locked",
        hasReviewPush: false,
      }),
    ).toBe("Completed");
    expect(
      studentFacingState({
        phase: "play",
        workStatus: "active",
        hasReviewPush: false,
      }),
    ).toBe("Active");
    expect(
      studentFacingState({
        phase: "play",
        workStatus: "locked",
        hasReviewPush: false,
      }),
    ).toBe("Submitted");
  });

  it("group: assign + shared card ids + orphan lock semantics", () => {
    const plan = planAssignWordCardsGroups({
      incoming: {
        groups: [
          { id: "g1", name: "Team A", memberIds: ["s1", "s2"] },
          { id: "g2", name: "Team B", memberIds: ["s3"] },
        ],
      },
      existingGroupOwnerIds: ["g1", "g_old"],
    });
    expect(plan.orphanOwnerIds).toEqual(["g_old"]);
    expect(plan.activeCardIds).toContain(cardIdForGroup("g1"));

    const groups = plan.groups.map((g) => ({
      ...g,
      leaderId: g.leaderId,
    }));
    expect(
      cardIdForUserInRound({
        participationMode: "group",
        userId: "s2",
        groups,
      }),
    ).toBe(cardIdForGroup("g1"));

    expect(
      canPushCardForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g_old",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(false);
    expect(
      canPushCardForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g1",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(true);
  });

  it("group: submit policies + approved group cards remain playable", () => {
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
        userId: "s1",
        cardOwnerType: "group",
        cardOwnerId: "g1",
        groups,
        policy: "everyone_ready",
        readyMemberIds: ["s1"],
      }),
    ).toBe(false);
    expect(
      canSubmitWordCardAsUser({
        participationMode: "group",
        userId: "s1",
        cardOwnerType: "group",
        cardOwnerId: "g1",
        groups,
        policy: "everyone_ready",
        readyMemberIds: ["s1", "s2"],
      }),
    ).toBe(true);

    const groupDeck: ApprovedDeckCard[] = [
      {
        id: cardIdForGroup("g1"),
        assignedWord: "apple",
        definition: "A fruit.",
        moderation: "approved",
      },
      {
        id: cardIdForGroup("g2"),
        assignedWord: "banana",
        definition: "Yellow.",
        moderation: "approved",
      },
      {
        id: cardIdForGroup("g3"),
        assignedWord: "cherry",
        definition: "Small.",
        moderation: "approved",
      },
      {
        id: cardIdForGroup("g4"),
        assignedWord: "date",
        definition: "Sweet.",
        moderation: "approved",
      },
    ];
    const playable = listApprovedPlayableCards(groupDeck);
    expect(playable).toHaveLength(4);
    expect(canStartDefinitionRace(playable.length)).toBe(true);
    expect(playable.every((c) => c.id.startsWith("card:group:"))).toBe(true);
  });
});
