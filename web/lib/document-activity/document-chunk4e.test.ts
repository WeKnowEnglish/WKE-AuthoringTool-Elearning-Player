import { describe, expect, it } from "vitest";
import { documentIdForGroup } from "@/lib/document-activity/domain";
import { planAssignGroups } from "@/lib/document-activity/group-membership";
import {
  canPushDocumentForReview,
  createDocumentCompareReview,
  createDocumentShowReview,
  documentReviewLabel,
  revealReviewResults,
  reviewResponseCounts,
  submitSharedReviewResponse,
} from "@/lib/document-activity/review";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";

describe("document group review wiring (chunk 4e/4f)", () => {
  it("labels named groups when not anonymous", () => {
    const review = createDocumentCompareReview({
      documentIds: ["document:group:g1", "document:group:g2"],
      anonymous: false,
      taskType: "vote",
    });
    expect(documentReviewLabel(review, "document:group:g1", 0, "Blue Team")).toBe("Blue Team");
    expect(documentReviewLabel(review, "document:group:g2", 1, "Red Team")).toBe("Red Team");
  });

  it("keeps anonymous A/B labels for group compare", () => {
    const review = createDocumentCompareReview({
      documentIds: ["document:group:g1", "document:group:g2"],
      anonymous: true,
    });
    expect(documentReviewLabel(review, "document:group:g1", 0, "Blue Team")).toBe("Response A");
    expect(documentReviewLabel(review, "document:group:g2", 1, "Red Team")).toBe("Response B");
  });

  it("falls back to Group {id} when displayName missing", () => {
    const review = createDocumentShowReview({
      documentId: "document:group:g7",
      anonymous: false,
    });
    expect(documentReviewLabel(review, "document:group:g7", 0)).toBe("Group g7");
  });

  it("allows push for collected/locked active groups and rejects orphans", () => {
    expect(
      canPushDocumentForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g1",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(true);
    expect(
      canPushDocumentForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g-old",
        activeGroupIds: ["g1", "g2"],
      }),
    ).toBe(false);
    expect(
      canPushDocumentForReview({
        status: "active",
        ownerType: "group",
        ownerId: "g1",
        activeGroupIds: ["g1"],
      }),
    ).toBe(false);
  });

  it("allows individual student docs after submit/collect", () => {
    expect(
      canPushDocumentForReview({
        status: "submitted",
        ownerType: "student",
        ownerId: "u1",
      }),
    ).toBe(true);
    expect(
      canPushDocumentForReview({
        status: "locked",
        ownerType: "student",
        ownerId: "u1",
        activeGroupIds: [],
      }),
    ).toBe(true);
  });

  it("runs group compare vote → reveal", () => {
    let review = createDocumentCompareReview({
      documentIds: ["document:group:g1", "document:group:g2"],
      anonymous: true,
      taskType: "choose_stronger",
    });
    review = submitSharedReviewResponse(review, {
      studentId: "u1",
      choice: "document:group:g2",
      nowMs: 1,
    });
    review = submitSharedReviewResponse(review, {
      studentId: "u2",
      choice: "document:group:g1",
      nowMs: 2,
    });
    expect(reviewResponseCounts(review).total).toBe(2);
    expect(review.status).toBe("open");
    review = revealReviewResults(review);
    expect(review.status).toBe("results");
    expect(reviewResponseCounts(review).byChoice["document:group:g2"]).toBe(1);
  });

  it("keeps orphan-and-lock plan aligned with review push rules", () => {
    const plan = planAssignGroups({
      incoming: {
        groups: [{ id: "g2", name: "Red", memberIds: ["c"] }],
      },
      existingGroupOwnerIds: ["g1", "g2"],
    });
    expect(plan.orphanOwnerIds).toEqual(["g1"]);
    expect(plan.activeDocumentIds).toEqual([documentIdForGroup("g2")]);
    expect(
      canPushDocumentForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g1",
        activeGroupIds: plan.groups.map((g) => g.id),
      }),
    ).toBe(false);
    expect(
      canPushDocumentForReview({
        status: "locked",
        ownerType: "group",
        ownerId: "g2",
        activeGroupIds: plan.groups.map((g) => g.id),
      }),
    ).toBe(true);
  });

  it("individual path still maps to class review when pushed", () => {
    expect(
      studentFacingState({
        phase: "collected",
        workStatus: "locked",
        hasReviewPush: true,
      }),
    ).toBe("Class review");
    const review = createDocumentShowReview({
      documentId: "document:student:a",
      anonymous: false,
    });
    expect(documentReviewLabel(review, "document:student:a", 0, "Alex")).toBe("Alex");
  });
});
