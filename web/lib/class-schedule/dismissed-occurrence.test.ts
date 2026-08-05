import { describe, expect, it } from "vitest";
import { endedSessionDismissesOccurrence } from "@/lib/class-schedule/dismissed-occurrence";

const OCCURRENCE_START = "2026-08-05T14:00:00.000Z";
const OCCURRENCE_END = "2026-08-05T15:00:00.000Z";
const SLOT_ID = "slot-1";

function meeting() {
  return {
    meetingSlotId: SLOT_ID,
    occurrenceStartsAt: OCCURRENCE_START,
    occurrenceEndsAt: OCCURRENCE_END,
  };
}

describe("endedSessionDismissesOccurrence", () => {
  it("dismisses when occurrence_starts_at matches", () => {
    expect(
      endedSessionDismissesOccurrence(
        {
          occurrence_starts_at: OCCURRENCE_START,
          meeting_slot_id: null,
          session_kind: "extra",
          ended_at: "2026-08-05T08:00:00.000Z",
          created_at: "2026-08-05T08:00:00.000Z",
        },
        meeting(),
      ),
    ).toBe(true);
  });

  it("dismisses extra sessions ended during the occurrence window", () => {
    expect(
      endedSessionDismissesOccurrence(
        {
          occurrence_starts_at: null,
          meeting_slot_id: null,
          session_kind: "extra",
          ended_at: "2026-08-05T14:30:00.000Z",
          created_at: "2026-08-05T14:10:00.000Z",
        },
        meeting(),
      ),
    ).toBe(true);
  });

  it("dismisses unbound scheduled sessions ended in the window", () => {
    expect(
      endedSessionDismissesOccurrence(
        {
          occurrence_starts_at: null,
          meeting_slot_id: null,
          session_kind: "scheduled",
          ended_at: "2026-08-05T14:05:00.000Z",
          created_at: "2026-08-05T13:50:00.000Z",
        },
        meeting(),
      ),
    ).toBe(true);
  });

  it("does not dismiss ended sessions from a different occurrence", () => {
    expect(
      endedSessionDismissesOccurrence(
        {
          occurrence_starts_at: "2026-08-04T14:00:00.000Z",
          meeting_slot_id: SLOT_ID,
          session_kind: "scheduled",
          ended_at: "2026-08-04T15:00:00.000Z",
          created_at: "2026-08-04T14:00:00.000Z",
        },
        meeting(),
      ),
    ).toBe(false);
  });
});
