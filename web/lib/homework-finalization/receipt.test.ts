import { describe, expect, it } from "vitest";
import { parseHomeworkFinalizationReceipt } from "./receipt";

describe("parseHomeworkFinalizationReceipt", () => {
  it("accepts the shared authoritative receipt", () => {
    expect(
      parseHomeworkFinalizationReceipt({
        homeworkId: "homework-1",
        format: "writing_prompt",
        status: "submitted",
        submittedAt: "2026-09-12T01:00:00.000Z",
        completedAt: "2026-09-12T01:00:00.000Z",
        duplicate: true,
        reconciled: false,
        rewardReceipt: { eventId: "primary:homework:homework-1" },
      }),
    ).toMatchObject({
      homeworkId: "homework-1",
      duplicate: true,
      rewardReceipt: { eventId: "primary:homework:homework-1" },
    });
  });

  it("rejects incomplete or unknown receipts", () => {
    expect(parseHomeworkFinalizationReceipt(null)).toBeNull();
    expect(parseHomeworkFinalizationReceipt({ format: "quiz" })).toBeNull();
    expect(
      parseHomeworkFinalizationReceipt({
        homeworkId: "homework-1",
        format: "graded_track",
        status: "submitted",
      }),
    ).toBeNull();
  });
});
