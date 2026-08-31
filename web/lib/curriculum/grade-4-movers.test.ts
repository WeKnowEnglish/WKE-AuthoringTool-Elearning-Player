import { describe, expect, it } from "vitest";

import {
  GRADE_4_MOVERS_COURSE,
  SESSION_1_SPEECH_TRIGGER_DRAFTS,
} from "@/lib/curriculum/grade-4-movers";

describe("Grade 4 Movers curriculum pilot", () => {
  it("publishes Session 1 and keeps the rest of Unit 1 visible as planned", () => {
    const sessions = GRADE_4_MOVERS_COURSE.units[0]?.sessions ?? [];

    expect(sessions).toHaveLength(9);
    expect(sessions[0]?.status).toBe("pilot");
    expect(sessions.slice(1).every((session) => session.status === "planned")).toBe(true);
  });

  it("uses specific, non-punitive segment feedback for speech triggers", () => {
    expect(SESSION_1_SPEECH_TRIGGER_DRAFTS.length).toBeGreaterThan(0);

    for (const trigger of SESSION_1_SPEECH_TRIGGER_DRAFTS) {
      const feedbackLanguage = [
        trigger.successMessage,
        trigger.retryLead,
        ...trigger.focusSegments.map((segment) => segment.pronunciationHint),
      ].join(" ");

      expect(feedbackLanguage).not.toMatch(/\b(wrong|incorrect|failed|bad)\b/i);

      for (const segment of trigger.focusSegments) {
        expect(segment.label.length).toBeGreaterThan(0);
        expect(trigger.modelText.toLowerCase()).toContain(segment.matchText.toLowerCase());
      }
    }
  });
});
