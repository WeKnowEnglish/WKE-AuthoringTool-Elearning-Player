import { describe, expect, it } from "vitest";
import {
  canResubmitSentenceSubmission,
  countSentenceSubmissionsNeedingResubmit,
  pickLatestSentenceSubmissionByWordId,
} from "@/lib/secondary/secondary-sentence-submissions";

describe("secondary-sentence-submissions", () => {
  it("picks latest non-superseded row per word", () => {
    const map = pickLatestSentenceSubmissionByWordId([
      {
        wordItemId: "w1",
        status: "submitted",
        submittedAt: "2026-07-10T12:00:00.000Z",
      },
      {
        wordItemId: "w1",
        status: "superseded",
        submittedAt: "2026-07-10T11:00:00.000Z",
      },
      {
        wordItemId: "w2",
        status: "needs_revision",
        submittedAt: "2026-07-10T10:00:00.000Z",
      },
    ]);

    expect(map.get("w1")?.status).toBe("submitted");
    expect(map.get("w2")?.status).toBe("needs_revision");
  });

  it("allows resubmit only for needs_revision", () => {
    expect(canResubmitSentenceSubmission("needs_revision")).toBe(true);
    expect(canResubmitSentenceSubmission("submitted")).toBe(false);
    expect(canResubmitSentenceSubmission("approved")).toBe(false);
  });

  it("counts words needing resubmit", () => {
    expect(
      countSentenceSubmissionsNeedingResubmit([
        {
          wordItemId: "w1",
          status: "needs_revision",
          submittedAt: "2026-07-10T10:00:00.000Z",
        },
        {
          wordItemId: "w2",
          status: "submitted",
          submittedAt: "2026-07-10T10:00:00.000Z",
        },
      ]),
    ).toBe(1);
  });
});
