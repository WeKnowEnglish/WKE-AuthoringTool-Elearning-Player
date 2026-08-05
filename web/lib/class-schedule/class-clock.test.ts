import { describe, expect, it } from "vitest";
import {
  CLASS_LIVE_OPEN_MS,
  CLASS_WAITING_OPEN_MS,
  clockPhaseToSessionPhase,
  deriveScheduledClockPhase,
} from "@/lib/class-schedule/class-clock";

describe("class clock", () => {
  const start = Date.parse("2026-08-05T12:00:00.000Z");
  const end = Date.parse("2026-08-05T13:00:00.000Z");

  it("is idle before waiting window", () => {
    expect(
      deriveScheduledClockPhase({
        occurrenceStartsAt: new Date(start),
        occurrenceEndsAt: new Date(end),
        nowMs: start - CLASS_WAITING_OPEN_MS - 60_000,
      }),
    ).toBe("idle");
  });

  it("opens waiting at T−15", () => {
    expect(
      deriveScheduledClockPhase({
        occurrenceStartsAt: new Date(start),
        occurrenceEndsAt: new Date(end),
        nowMs: start - CLASS_WAITING_OPEN_MS + 1_000,
      }),
    ).toBe("waiting");
  });

  it("goes live at T−5", () => {
    expect(
      deriveScheduledClockPhase({
        occurrenceStartsAt: new Date(start),
        occurrenceEndsAt: new Date(end),
        nowMs: start - CLASS_LIVE_OPEN_MS + 1_000,
      }),
    ).toBe("live");
  });

  it("maps clock to session phase", () => {
    expect(clockPhaseToSessionPhase("waiting")).toBe("waiting");
    expect(clockPhaseToSessionPhase("live")).toBe("live");
    expect(clockPhaseToSessionPhase("idle")).toBe("prep");
    expect(clockPhaseToSessionPhase("waiting", true)).toBe("live");
  });
});
