import { describe, expect, it } from "vitest";
import { occurrenceStartsMatch } from "@/lib/class-schedule/occurrence-match";

describe("occurrenceStartsMatch", () => {
  it("matches within tolerance", () => {
    const a = "2026-08-05T10:00:00.000Z";
    const b = new Date("2026-08-05T10:00:30.000Z");
    expect(occurrenceStartsMatch(a, b, 60_000)).toBe(true);
  });

  it("rejects different occurrences", () => {
    expect(
      occurrenceStartsMatch(
        "2026-08-05T10:00:00.000Z",
        "2026-08-12T10:00:00.000Z",
      ),
    ).toBe(false);
  });
});
