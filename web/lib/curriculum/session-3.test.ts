import { describe, expect, it } from "vitest";

import {
  SESSION_3_ACTIVITIES,
  SESSION_3_CHECKS,
  SESSION_3_MATRIX,
  SESSION_3_PRACTICE_ACTIVITIES,
  SESSION_3_WRITING_PROMPT,
} from "./session-3";

describe("Grade 4 Session 3 content", () => {
  it("forms a measurable speaking-first progression", () => {
    expect(SESSION_3_ACTIVITIES).toHaveLength(3);
    expect(SESSION_3_CHECKS).toHaveLength(3);
    expect(SESSION_3_MATRIX.some((item) => item.primitive === "local_audio_recording")).toBe(true);
    expect(SESSION_3_MATRIX.at(-1)?.iteration).toBe("next");
  });

  it("ships a complete supporting practice set", () => {
    expect(SESSION_3_PRACTICE_ACTIVITIES).toHaveLength(7);
    expect(SESSION_3_WRITING_PROMPT.minimumWords).toBeGreaterThanOrEqual(20);
  });
});
