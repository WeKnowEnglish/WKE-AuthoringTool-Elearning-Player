import { describe, expect, it } from "vitest";
import {
  assessmentAttemptStorageKey,
  assessmentProgress,
  listAssessmentParts,
  PRIMARY_A2_ASSESSMENT_PILOT,
  sanitizeAssessmentResponses,
} from "@/lib/assessment";

describe("assessment progress", () => {
  it("lists all parts in section order", () => {
    expect(listAssessmentParts(PRIMARY_A2_ASSESSMENT_PILOT).map((part) => part.id)).toEqual([
      "listening-part-1",
      "listening-part-2",
      "listening-part-3",
      "listening-part-4",
      "listening-part-5",
      "rw-part-1",
      "rw-part-2",
      "rw-part-3",
      "rw-part-4",
      "rw-part-5",
      "rw-part-6",
      "rw-part-7",
      "speaking-part-1",
      "speaking-part-2",
      "speaking-part-3",
    ]);
  });

  it("counts answered items separately from correct items", () => {
    const progress = assessmentProgress(PRIMARY_A2_ASSESSMENT_PILOT, {
      "rw-part-1": { "p1-bridge": "p1-bridge", "p1-diary": "wrong" },
      "rw-part-6": { "p6-g1": "went" },
    });
    expect(progress.total).toBe(65);
    expect(progress.objectiveTotal).toBe(62);
    expect(progress.answered).toBe(3);
    expect(progress.correct).toBe(2);
    expect(progress.parts["rw-part-1"]).toEqual({ answered: 2, total: 5, correct: 1, objectiveTotal: 5 });
  });

  it("versions browser drafts by assessment content version", () => {
    expect(assessmentAttemptStorageKey(PRIMARY_A2_ASSESSMENT_PILOT)).toContain(
      "2026.08-pilot.6",
    );
  });

  it("scores short reading answers with forgiving case and punctuation", () => {
    const progress = assessmentProgress(PRIMARY_A2_ASSESSMENT_PILOT, {
      "rw-part-5": {
        "p5-q1": "On Tuesday afternoon.",
        "p5-q2": "WATER",
      },
    });
    expect(progress.parts["rw-part-5"]).toEqual({ answered: 2, total: 5, correct: 2, objectiveTotal: 5 });
  });

  it("scores picture, dialogue, story-bank and title answers", () => {
    const progress = assessmentProgress(PRIMARY_A2_ASSESSMENT_PILOT, {
      "rw-part-2": { "p2-q1": "yes", "p2-q2": "no" },
      "rw-part-3": { "p3-q1": "p3-r4", "p3-q2": "p3-r2" },
      "rw-part-4": {
        "p4-g1": "p4-w-inside",
        "p4-g2": "p4-w-cloudy",
        "p4-title": "p4-title-a",
      },
    });
    expect(progress.parts["rw-part-2"]).toEqual({ answered: 2, total: 6, correct: 1, objectiveTotal: 6 });
    expect(progress.parts["rw-part-3"]).toEqual({ answered: 2, total: 5, correct: 1, objectiveTotal: 5 });
    expect(progress.parts["rw-part-4"]).toEqual({ answered: 3, total: 6, correct: 2, objectiveTotal: 6 });
  });

  it("scores all five listening response formats", () => {
    const progress = assessmentProgress(PRIMARY_A2_ASSESSMENT_PILOT, {
      "listening-part-1": { "lp1-c1": "lp1-name-lucy", "lp1-c2": "wrong" },
      "listening-part-2": { "lp2-date": "18th", "lp2-teacher": "PARKER." },
      "listening-part-3": { "lp3-mia": "lp3-painting", "lp3-ethan": "wrong" },
      "listening-part-4": { "lp4-q1": "lp4-q1-drawing", "lp4-q2": "wrong" },
      "listening-part-5": { "lp5-window": "blue", "lp5-table": "red" },
    });
    expect(progress.parts["listening-part-1"]).toEqual({ answered: 2, total: 5, correct: 1, objectiveTotal: 5 });
    expect(progress.parts["listening-part-2"]).toEqual({ answered: 2, total: 5, correct: 2, objectiveTotal: 5 });
    expect(progress.parts["listening-part-3"]).toEqual({ answered: 2, total: 5, correct: 1, objectiveTotal: 5 });
    expect(progress.parts["listening-part-4"]).toEqual({ answered: 2, total: 5, correct: 1, objectiveTotal: 5 });
    expect(progress.parts["listening-part-5"]).toEqual({ answered: 2, total: 5, correct: 1, objectiveTotal: 5 });
  });

  it("counts speaking submissions without adding them to the objective score", () => {
    const progress = assessmentProgress(PRIMARY_A2_ASSESSMENT_PILOT, {
      "speaking-part-1": { "sp1-recording": "recording-one" },
      "speaking-part-2": { "sp2-recording": "recording-two" },
      "speaking-part-3": { "sp3-recording": "recording-three" },
    });
    expect(progress.answered).toBe(3);
    expect(progress.total).toBe(65);
    expect(progress.correct).toBe(0);
    expect(progress.objectiveTotal).toBe(62);
    expect(progress.parts["speaking-part-1"]).toEqual({ answered: 1, total: 1, correct: 0, objectiveTotal: 0 });
  });

  it("removes unknown parts/items and bounds persisted answers", () => {
    expect(sanitizeAssessmentResponses(PRIMARY_A2_ASSESSMENT_PILOT, {
      unknown: { hacked: "no" },
      "rw-part-7": { "p7-g1": "to", unknown: "no" },
    })).toEqual({ "rw-part-7": { "p7-g1": "to" } });
  });
});
