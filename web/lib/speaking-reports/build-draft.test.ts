import { describe, expect, it } from "vitest";
import { buildSpeakingReportDraft } from "@/lib/speaking-reports/build-draft";

describe("buildSpeakingReportDraft", () => {
  it("matches roster names and builds follow-ups", () => {
    const draft = buildSpeakingReportDraft({
      sessionTitle: "Monday Class",
      classTitle: "Grade 4",
      plainText: [
        "Teacher: Good morning everyone.",
        "Mia: I like apples.",
        "Teacher: Great Mia. What about you?",
        "Mia: I also like bananas.",
        "Zara: Can I say something?",
      ].join("\n"),
      roster: [
        { studentId: "1", displayName: "Mia" },
        { studentId: "2", displayName: "Zara" },
        { studentId: "3", displayName: "Leo" },
      ],
    });

    expect(draft.schemaVersion).toBe(1);
    expect(draft.studentNotes).toHaveLength(3);
    const mia = draft.studentNotes.find((n) => n.displayName === "Mia");
    const leo = draft.studentNotes.find((n) => n.displayName === "Leo");
    expect(mia?.matchedInTranscript).toBe(true);
    expect(mia?.mentionCount).toBeGreaterThan(0);
    expect(leo?.matchedInTranscript).toBe(false);
    expect(draft.followUps.some((item) => /Leo/.test(item))).toBe(true);
    expect(draft.keyMoments.length).toBeGreaterThan(0);
  });
});
