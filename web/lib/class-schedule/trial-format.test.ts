import { describe, expect, it } from "vitest";
import {
  formatTrialSlotLabel,
  formatTrialSlotLabelInTimeZone,
  mapAvailabilitySlotRow,
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
