import { describe, expect, it } from "vitest";
import {
  createDocumentCompareReview,
  createDocumentShowReview,
  documentReviewLabel,
  revealReviewResults,
  reviewResponseCounts,
  submitSharedReviewResponse,
} from "@/lib/document-activity/review";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";

describe("document review chunk 3", () => {
  it("creates show review with notice task", () => {
    const review = createDocumentShowReview({
      documentId: "document:student:a",
      anonymous: false,
    });
    expect(review.mode).toBe("show");
    expect(review.targetIds).toEqual(["document:student:a"]);
    expect(review.task.type).toBe("notice");
    expect(review.status).toBe("open");
  });

  it("creates anonymous compare with stronger default", () => {
    const review = createDocumentCompareReview({
      documentIds: ["document:student:a", "document:student:b"],
      anonymous: true,
    });
    expect(review.mode).toBe("compare");
    expect(review.task.type).toBe("choose_stronger");
    expect(documentReviewLabel(review, "document:student:a", 0)).toBe("Response A");
    expect(documentReviewLabel(review, "document:student:b", 1)).toBe("Response B");
  });

  it("accepts votes and hides results until reveal", () => {
    let review = createDocumentCompareReview({
      documentIds: ["document:student:a", "document:student:b"],
      anonymous: true,
      taskType: "choose_stronger",
    });
    review = submitSharedReviewResponse(review, {
      studentId: "u1",
      choice: "document:student:b",
      nowMs: 1,
    });
    expect(reviewResponseCounts(review).byChoice["document:student:b"]).toBe(1);
    expect(review.status).toBe("open");
    review = revealReviewResults(review);
    expect(review.status).toBe("results");
  });

  it("maps student facing state to class review when pushed", () => {
    expect(
      studentFacingState({
        phase: "collected",
        workStatus: "locked",
        hasReviewPush: true,
      }),
    ).toBe("Class review");
  });
});
