import { describe, expect, it } from "vitest";
import {
  formatPublicTrialDayLabel,
  formatPublicTrialRange,
  formatTrialSlotLabel,
  formatTrialSlotLabelInTimeZone,
  groupPublicTrialTimes,
  mapAvailabilitySlotRow,
  publicTrialTimezoneLabel,
} from "@/lib/class-schedule/trial-format";

describe("trial time formatting", () => {
  const slot = {
    startsAt: "2026-08-22T02:00:00.000Z",
    durationMinutes: 45,
    timezone: "Asia/Ho_Chi_Minh",
  };

  it("can display one instant in the viewer and teacher timezones", () => {
    const teacher = formatTrialSlotLabel(slot);
    const parent = formatTrialSlotLabelInTimeZone(slot, "Europe/London");
    expect(teacher).toContain("Asia/Ho_Chi_Minh");
    expect(parent).toContain("Europe/London");
    expect(parent).not.toBe(teacher);
  });

  it("maps recurrence metadata without breaking older standalone rows", () => {
    const mapped = mapAvailabilitySlotRow({
      id: "slot-1",
      teacher_id: "teacher-1",
      starts_at: slot.startsAt,
      duration_minutes: 45,
      timezone: slot.timezone,
      status: "open",
      note: null,
    });
    expect(mapped?.seriesId).toBeNull();
    expect(mapped?.seriesSequence).toBeNull();
  });
});

describe("public wall trial schedule", () => {
  const saturday = {
    startsAt: "2026-08-22T02:00:00.000Z",
    durationMinutes: 45,
    timezone: "Asia/Ho_Chi_Minh",
  };
  const laterSaturday = {
    startsAt: "2026-08-22T06:00:00.000Z",
    durationMinutes: 30,
    timezone: "Asia/Ho_Chi_Minh",
  };
  const sunday = {
    startsAt: "2026-08-23T02:00:00.000Z",
    durationMinutes: 45,
    timezone: "Asia/Ho_Chi_Minh",
  };

  it("formats a clock range and day in the teacher timezone", () => {
    expect(formatPublicTrialDayLabel(saturday.startsAt, saturday.timezone)).toBe("Sat, Aug 22");
    expect(formatPublicTrialRange(saturday)).toMatch(/9:00.*9:45/);
  });

  it("groups open times by day and keeps a single timezone footnote", () => {
    const groups = groupPublicTrialTimes([
      saturday,
      laterSaturday,
      sunday,
      { startsAt: "not-a-date", durationMinutes: 45, timezone: "Asia/Ho_Chi_Minh" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.slots).toHaveLength(2);
    expect(groups[0]?.dayLabel).toBe("Sat, Aug 22");
    expect(groups[1]?.dayLabel).toBe("Sun, Aug 23");
    expect(publicTrialTimezoneLabel(groups)).toBe("Asia/Ho_Chi_Minh");
  });
});
