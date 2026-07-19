import { describe, expect, it } from "vitest";
import {
  defaultPromptForTemplate,
  defaultScaffoldsForTemplate,
  documentIdForGroup,
  documentIdForStudent,
  documentIdForWholeClass,
  templateUsesStimulus,
} from "@/lib/document-activity/domain";
import {
  canCompareInParticipationMode,
  canSubmitDocumentAsUser,
  documentIdForUserInRound,
} from "@/lib/document-activity/group-membership";
import { createDocumentInitialStorage } from "@/lib/document-activity/liveblocks/initial-storage";
import {
  createDocumentCompareReview,
  documentReviewLabel,
  revealReviewResults,
  submitSharedReviewResponse,
} from "@/lib/document-activity/review";

/**
 * Chunk 5e — cross-mode regression after templates + whole-class.
 * Individual + group paths must stay green alongside whole_class.
 */
describe("document chunk 5 regression (5e)", () => {
  it("resolves document ids for all three participation modes", () => {
    const groups = [
      { id: "g1", name: "Blue", memberIds: ["u1", "u2"], leaderId: "u1" },
    ];
    expect(
      documentIdForUserInRound({
        participationMode: "individual",
        userId: "u1",
        groups: [],
      }),
    ).toBe(documentIdForStudent("u1"));
    expect(
      documentIdForUserInRound({
        participationMode: "group",
        userId: "u2",
        groups,
      }),
    ).toBe(documentIdForGroup("g1"));
    expect(
      documentIdForUserInRound({
        participationMode: "whole_class",
        userId: "u1",
        groups: [],
      }),
    ).toBe(documentIdForWholeClass());
  });

  it("keeps submit rules: individual/group ok, whole-class host-collect only", () => {
    expect(
      canSubmitDocumentAsUser({
        participationMode: "individual",
        userId: "u1",
        documentOwnerType: "student",
        documentOwnerId: "u1",
        groups: [],
        groupSubmitPolicy: "any_member",
        readyMemberIds: [],
      }).ok,
    ).toBe(true);
    expect(
      canSubmitDocumentAsUser({
        participationMode: "group",
        userId: "u2",
        documentOwnerType: "group",
        documentOwnerId: "g1",
        groups: [{ id: "g1", name: "Blue", memberIds: ["u1", "u2"], leaderId: "u1" }],
        groupSubmitPolicy: "any_member",
        readyMemberIds: [],
      }).ok,
    ).toBe(true);
    expect(
      canSubmitDocumentAsUser({
        participationMode: "whole_class",
        userId: "u1",
        documentOwnerType: "class",
        documentOwnerId: "class",
        groups: [],
        groupSubmitPolicy: "any_member",
        readyMemberIds: [],
      }).ok,
    ).toBe(false);
  });

  it("allows Compare for individual/group only", () => {
    expect(canCompareInParticipationMode("individual")).toBe(true);
    expect(canCompareInParticipationMode("group")).toBe(true);
    expect(canCompareInParticipationMode("whole_class")).toBe(false);
  });

  it("keeps template + stimulus packs distinct", () => {
    expect(defaultPromptForTemplate("paragraph").title).not.toBe(
      defaultPromptForTemplate("dialogue").title,
    );
    expect(templateUsesStimulus("reading_response")).toBe(true);
    expect(defaultScaffoldsForTemplate("story_continuation").wordBank.length).toBeGreaterThan(0);
    expect(defaultPromptForTemplate("story_continuation").stimulus?.length).toBeGreaterThan(0);
  });

  it("seeds whole-class storage with one class document only", () => {
    const storage = createDocumentInitialStorage({
      hostUserId: "t1",
      roundId: "docr_reg",
      vcSessionId: "vcs_REG001",
      participationMode: "whole_class",
      templateType: "paragraph",
    });
    expect(storage.documents.size).toBe(1);
    expect(storage.documents.get(documentIdForWholeClass())?.get("ownerType")).toBe("class");
  });

  it("keeps individual compare → vote → reveal path", () => {
    let review = createDocumentCompareReview({
      documentIds: ["document:student:a", "document:student:b"],
      anonymous: true,
      taskType: "choose_stronger",
    });
    expect(documentReviewLabel(review, "document:student:a", 0)).toBe("Response A");
    review = submitSharedReviewResponse(review, {
      studentId: "u1",
      choice: "document:student:a",
      nowMs: 1,
    });
    review = revealReviewResults(review);
    expect(review.status).toBe("results");
  });
});
