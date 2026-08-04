import { describe, expect, it } from "vitest";
import { assessmentProgress, listAssessmentParts } from "@/lib/assessment";
import { PRIMARY_A2_ASSESSMENT_PILOT } from "@/lib/assessment/sample-primary-a2";
import { seedAssessmentFromTemplate } from "@/lib/activity-tracks/seed-assessment";
import {
  buildAssessmentTrackFreezeDocument,
  freezeAssessmentTrackHomeworkPayload,
} from "@/lib/class-homework/freeze-assessment-track";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { resolveHomeworkAssessmentDefinition } from "@/lib/class-homework/resolve-assessment-definition";

describe("freezeAssessmentTrackHomeworkPayload", () => {
  it("embeds the cloned assessment definition in the homework payload", () => {
    const draft = seedAssessmentFromTemplate({
      trackId: "track-assess-1",
      title: "Class A2 Check",
    });
    if (draft.assessmentDefinition) {
      draft.assessmentDefinition.sections[0]!.title = "Edited Listening";
    }
    const payload = freezeAssessmentTrackHomeworkPayload({ document: draft });
    expect(payload.type).toBe("primary_a2_assessment");
    expect(payload.title).toBe("Class A2 Check");
    expect(payload.trackId).toBe("track-assess-1");
    expect(payload.document).toBeTruthy();
    expect(payload.contentVersion).toMatch(/\.edit-/);
    expect(payload.contentVersion).not.toBe(
      PRIMARY_A2_ASSESSMENT_PILOT.contentVersion,
    );
    expect(payload.itemCount).toBe(
      assessmentProgress(PRIMARY_A2_ASSESSMENT_PILOT, {}).total,
    );

    const normalized = normalizeHomeworkPayload(payload);
    expect(normalized?.type).toBe("primary_a2_assessment");
    if (!normalized || normalized.type !== "primary_a2_assessment") {
      throw new Error("expected primary_a2_assessment");
    }
    expect(normalized.document).toBeTruthy();
    const definition = resolveHomeworkAssessmentDefinition(normalized);
    expect(definition.title).toBe("Class A2 Check");
    expect(definition.sections[0]?.title).toBe("Edited Listening");
    expect(listAssessmentParts(definition)).toHaveLength(
      listAssessmentParts(PRIMARY_A2_ASSESSMENT_PILOT).length,
    );
  });

  it("throws when the track is not an assessment with a definition", () => {
    expect(() =>
      buildAssessmentTrackFreezeDocument({
        ...seedAssessmentFromTemplate({ trackId: "x", title: "t" }),
        mode: "graded",
        assessmentDefinition: null,
      }),
    ).toThrow(/Only Assessment tracks/);
  });
});

describe("resolveHomeworkAssessmentDefinition", () => {
  it("falls back to the fixture for pointer-only payloads", () => {
    const definition = resolveHomeworkAssessmentDefinition({
      type: "primary_a2_assessment",
      definitionId: "primary-a2-exit-pilot",
      contentVersion: PRIMARY_A2_ASSESSMENT_PILOT.contentVersion,
      title: PRIMARY_A2_ASSESSMENT_PILOT.title,
      itemCount: 10,
      frozenAt: new Date().toISOString(),
    });
    expect(definition.id).toBe(PRIMARY_A2_ASSESSMENT_PILOT.id);
    expect(definition.contentVersion).toBe(
      PRIMARY_A2_ASSESSMENT_PILOT.contentVersion,
    );
  });
});
