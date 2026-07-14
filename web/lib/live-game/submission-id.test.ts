import { describe, expect, it } from "vitest";
import { createLiveGameSubmissionId } from "@/lib/live-game/submission-id";

describe("createLiveGameSubmissionId", () => {
  it("uses native randomUUID when available", () => {
    const id = "00000000-0000-4000-8000-000000000001" as const;
    expect(createLiveGameSubmissionId({ randomUUID: () => id })).toBe(id);
  });

  it("creates a valid v4 UUID when randomUUID is unavailable", () => {
    const id = createLiveGameSubmissionId({
      getRandomValues(array) {
        array.fill(17);
        return array;
      },
    });
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
