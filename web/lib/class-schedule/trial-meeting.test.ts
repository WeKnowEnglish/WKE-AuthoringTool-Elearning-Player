import { describe, expect, it } from "vitest";
import { trialOccurrenceToLiveMeeting } from "@/lib/class-schedule/trial-meeting";

const row = {
  id: "occurrence-1",
  class_id: "class-1",
  teacher_id: "teacher-1",
  starts_at: "2026-08-22T02:00:00.000Z",
  duration_minutes: 45,
  timezone: "Asia/Ho_Chi_Minh",
};

describe("trial occurrence live meeting", () => {
  it("becomes a one-off scheduled meeting without pretending to be a weekly slot", () => {
    const meeting = trialOccurrenceToLiveMeeting(
      row,
      new Date("2026-08-22T01:50:00.000Z"),
    );
    expect(meeting?.source).toBe("trial");
    expect(meeting?.slot.id).toBe("trial:occurrence-1");
    expect(meeting?.startsAt.toISOString()).toBe(row.starts_at);
    expect(meeting?.endsAt.toISOString()).toBe("2026-08-22T02:45:00.000Z");
  });

  it("drops out after the occurrence and soft-close window", () => {
    expect(
      trialOccurrenceToLiveMeeting(
        row,
        new Date("2026-08-22T03:01:00.000Z"),
      ),
    ).toBeNull();
  });
});
