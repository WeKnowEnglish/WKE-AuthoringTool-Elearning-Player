import { describe, expect, it } from "vitest";

import {
  GRADE_4_MOVERS_COURSE,
  SESSION_1_SPEECH_TRIGGER_DRAFTS,
} from "@/lib/curriculum/grade-4-movers";

describe("Grade 4 Movers curriculum pilot", () => {
  it("publishes the first three pilots and keeps the rest of Unit 1 visible as planned", () => {
    const sessions = GRADE_4_MOVERS_COURSE.units[0]?.sessions ?? [];

    expect(sessions).toHaveLength(9);
    expect(sessions[0]?.status).toBe("pilot");
    expect(sessions[1]?.status).toBe("pilot");
    expect(sessions[1]?.pilotHref).toBe("/pilots/grade-4-learning-paths/unit-1/session-2");
    expect(sessions[1]?.studentHref).toBe("/primary/learn/grade-4/unit-1/session-2");
    expect(sessions[2]?.status).toBe("pilot");
    expect(sessions[2]?.pilotHref).toBe("/pilots/grade-4-learning-paths/unit-1/session-3");
    expect(sessions[2]?.studentHref).toBe("/primary/learn/grade-4/unit-1/session-3");
    expect(sessions.slice(3).every((session) => session.status === "planned")).toBe(true);
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
