import { describe, expect, it } from "vitest";
import { listAssessmentParts } from "@/lib/assessment";
import {
  PRIMARY_A2_ASSESSMENT_PILOT,
  PRIMARY_A2_READING_WRITING_MINUTES,
  buildPrimaryA2ReadingWritingOnly,
} from "@/lib/assessment/sample-primary-a2";
import {
  resetAssessmentFromOrigin,
  seedAssessmentFromTemplate,
} from "@/lib/activity-tracks/seed-assessment";

describe("seedAssessmentFromTemplate", () => {
  it("defaults to Reading & Writing only", () => {
    const doc = seedAssessmentFromTemplate({
      trackId: "track-a2-rw",
      title: "My R&W check",
    });
    expect(doc.mode).toBe("assessment");
    expect(doc.title).toBe("My R&W check");
    expect(doc.assessmentDefinition?.title).toBe("My R&W check");
    expect(doc.assessmentDefinition?.sections.map((s) => s.id)).toEqual([
      "reading-writing",
    ]);
    expect(doc.assessmentDefinition?.estimatedMinutes).toBe(
      PRIMARY_A2_READING_WRITING_MINUTES,
    );
    expect(doc.assessmentOrigin?.paper).toBe("reading-writing");
    expect(doc.assessmentOrigin?.definitionId).toBe(PRIMARY_A2_ASSESSMENT_PILOT.id);
    expect(listAssessmentParts(doc.assessmentDefinition!)).toHaveLength(
      listAssessmentParts(buildPrimaryA2ReadingWritingOnly()).length,
    );
    expect(doc.practiceComposition).toBeNull();
    expect(doc.gradedOrigin).toBeNull();
  });

  it("can still seed the full Listening + R&W + Speaking paper", () => {
    const doc = seedAssessmentFromTemplate({
      trackId: "track-a2-full",
      title: "Full check",
      paper: "full",
    });
    expect(doc.assessmentOrigin?.paper).toBe("full");
    expect(doc.assessmentDefinition?.sections.map((s) => s.id)).toEqual([
      "listening",
      "reading-writing",
      "speaking",
    ]);
    expect(listAssessmentParts(doc.assessmentDefinition!)).toHaveLength(
      listAssessmentParts(PRIMARY_A2_ASSESSMENT_PILOT).length,
    );
  });

  it("resetAssessmentFromOrigin restores the same paper and keeps track title", () => {
    const doc = seedAssessmentFromTemplate({
      trackId: "track-reset",
      title: "Custom title",
    });
    if (!doc.assessmentDefinition) throw new Error("missing definition");
    doc.assessmentDefinition.sections[0]!.title = "Edited R&W";
    const reset = resetAssessmentFromOrigin(doc);
    expect(reset.title).toBe("Custom title");
    expect(reset.assessmentOrigin?.paper).toBe("reading-writing");
    expect(reset.assessmentDefinition?.sections.map((s) => s.id)).toEqual([
      "reading-writing",
    ]);
    expect(reset.assessmentDefinition?.sections[0]?.title).toBe(
      "Reading & Writing",
    );
  });
});

describe("buildPrimaryA2ReadingWritingOnly", () => {
  it("keeps seven R&W parts and drops listening/speaking", () => {
    const definition = buildPrimaryA2ReadingWritingOnly();
    expect(definition.sections).toHaveLength(1);
    expect(definition.sections[0]?.parts).toHaveLength(7);
    expect(definition.sections.some((s) => s.id === "listening")).toBe(false);
    expect(definition.sections.some((s) => s.id === "speaking")).toBe(false);
  });
});
