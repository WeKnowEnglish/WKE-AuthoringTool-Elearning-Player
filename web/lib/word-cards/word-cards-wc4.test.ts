import { describe, expect, it } from "vitest";
import { teacherControlLabel } from "@/lib/activity-runtime/activity-commands";
import { studentFacingState } from "@/lib/activity-runtime/activity-phases";
import {
  canPushCardForReview,
  createWordCardsCompareReview,
  createWordCardsShowReview,
  revealReviewResults,
  submitSharedReviewResponse,
  wordCardsReviewLabel,
} from "@/lib/word-cards/review";

describe("word cards Show/Compare (WC-4)", () => {
  it("exposes Show / Compare / Reveal labels", () => {
    expect(teacherControlLabel("SHOW")).toBe("Show");
    expect(teacherControlLabel("COMPARE")).toBe("Compare");
    expect(teacherControlLabel("REVEAL_RESULTS")).toBe("Reveal results");
    expect(teacherControlLabel("CLEAR_SHOW")).toBe("Close show");
    expect(teacherControlLabel("CLEAR_COMPARE")).toBe("Close compare");
  });

  it("only allows collected-style cards for push", () => {
    expect(
      canPushCardForReview({ status: "locked", ownerType: "student" }),
    ).toBe(true);
    expect(
      canPushCardForReview({ status: "auto_submitted", ownerType: "student" }),
    ).toBe(true);
    expect(
      canPushCardForReview({ status: "active", ownerType: "student" }),
    ).toBe(false);
    expect(
      canPushCardForReview({ status: "locked", ownerType: "teacher" }),
    ).toBe(false);
  });

  it("creates show/compare review with card targets", () => {
    const show = createWordCardsShowReview({
      cardId: "card:student:a",
      anonymous: false,
    });
    expect(show.mode).toBe("show");
    expect(show.targetIds).toEqual(["card:student:a"]);
    expect(show.task.type).toBe("notice");

    const compare = createWordCardsCompareReview({
      cardIds: ["card:student:a", "card:student:b"],
      anonymous: true,
    });
    expect(compare.mode).toBe("compare");
    expect(compare.targetIds).toHaveLength(2);
    expect(compare.anonymous).toBe(true);
    expect(wordCardsReviewLabel(compare, "card:student:a", 0)).toBe("Card A");
  });

  it("accepts student review responses and reveals aggregates", () => {
    let review = createWordCardsShowReview({
      cardId: "card:student:a",
      anonymous: false,
      taskType: "agree_disagree",
    });
    review = submitSharedReviewResponse(review, {
      studentId: "s1",
      choice: "agree",
      note: "Clear definition.",
    });
    expect(review.responsesByStudentId.s1?.choice).toBe("agree");
    review = revealReviewResults(review);
    expect(review.status).toBe("results");
  });

  it("maps review push to Class review for students", () => {
    expect(
      studentFacingState({
        phase: "collected",
        workStatus: "locked",
        hasReviewPush: true,
      }),
    ).toBe("Class review");
  });
});
