import { describe, expect, it } from "vitest";
import { listAssessmentParts } from "@/lib/assessment";
import { PRIMARY_A2_ASSESSMENT_PILOT } from "@/lib/assessment/sample-primary-a2";
import {
  resetAssessmentFromOrigin,
  seedAssessmentFromTemplate,
} from "@/lib/activity-tracks/seed-assessment";

describe("seedAssessmentFromTemplate", () => {
  it("clones Primary A2 into assessment mode with origin metadata", () => {
    const doc = seedAssessmentFromTemplate({
      trackId: "track-a2",
      title: "My A2 check",
    });
    expect(doc.mode).toBe("assessment");
    expect(doc.title).toBe("My A2 check");
    expect(doc.assessmentDefinition?.title).toBe("My A2 check");
    expect(doc.assessmentDefinition?.id).toBe(PRIMARY_A2_ASSESSMENT_PILOT.id);
    expect(doc.assessmentOrigin?.definitionId).toBe(PRIMARY_A2_ASSESSMENT_PILOT.id);
    expect(doc.assessmentOrigin?.contentVersion).toBe(
      PRIMARY_A2_ASSESSMENT_PILOT.contentVersion,
    );
    expect(doc.practiceComposition).toBeNull();
    expect(doc.gradedOrigin).toBeNull();
    expect(listAssessmentParts(doc.assessmentDefinition!)).toHaveLength(
      listAssessmentParts(PRIMARY_A2_ASSESSMENT_PILOT).length,
    );
  });

  it("resetAssessmentFromOrigin restores fixture body but keeps track title", () => {
    const doc = seedAssessmentFromTemplate({
      trackId: "track-reset",
      title: "Custom title",
    });
    if (!doc.assessmentDefinition) throw new Error("missing definition");
    doc.assessmentDefinition.sections[0]!.title = "Edited listening";
    const reset = resetAssessmentFromOrigin(doc);
    expect(reset.title).toBe("Custom title");
    expect(reset.assessmentDefinition?.sections[0]?.title).toBe(
      PRIMARY_A2_ASSESSMENT_PILOT.sections[0]?.title,
    );
  });
});
