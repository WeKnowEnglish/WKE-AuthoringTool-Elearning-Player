import { describe, expect, it } from "vitest";
import {
  listAssessmentAssignIssues,
  PRIMARY_A2_ASSESSMENT_PILOT,
} from "@/lib/assessment";
import { bumpAssessmentContentVersion } from "@/lib/assessment/bump-content-version";

describe("bumpAssessmentContentVersion", () => {
  it("appends an edit stamp and strips a previous edit suffix", () => {
    const first = bumpAssessmentContentVersion("2026.08-pilot.6");
    expect(first).toMatch(/^2026\.08-pilot\.6\.edit-\d+-\d+$/);
    const second = bumpAssessmentContentVersion(first);
    expect(second).toMatch(/^2026\.08-pilot\.6\.edit-\d+-\d+$/);
    expect(second).not.toBe(first);
  });
});

describe("listAssessmentAssignIssues", () => {
  it("reports no blockers for the Primary A2 fixture", () => {
    expect(listAssessmentAssignIssues(PRIMARY_A2_ASSESSMENT_PILOT)).toEqual([]);
  });

  it("flags empty scene media on character match", () => {
    const broken = structuredClone(PRIMARY_A2_ASSESSMENT_PILOT);
    const part = broken.sections[0]!.parts[0]!;
    if (part.kind !== "listening_character_match") {
      throw new Error("expected listening part 1");
    }
    part.activity.image.src = "";
    const issues = listAssessmentAssignIssues(broken);
    expect(issues.some((issue) => /Scene picture/.test(issue.message))).toBe(
      true,
    );
  });
});
