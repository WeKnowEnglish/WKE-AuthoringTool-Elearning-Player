import { describe, expect, it } from "vitest";
import { seedAssessmentFromTemplate } from "@/lib/activity-tracks/seed-assessment";
import { patchAssessmentDefinitionPart } from "@/lib/activity-tracks/patch-assessment-part";

describe("patchAssessmentDefinitionPart", () => {
  it("replaces one part without mutating other sections", () => {
    const doc = seedAssessmentFromTemplate({
      trackId: "t1",
      title: "Check",
    });
    const definition = doc.assessmentDefinition!;
    const target = definition.sections
      .flatMap((section) => section.parts)
      .find((part) => part.kind === "picture_yes_no");
    if (!target || target.kind !== "picture_yes_no") {
      throw new Error("expected picture_yes_no part");
    }
    const next = patchAssessmentDefinitionPart(definition, target.id, {
      ...target,
      title: "Edited look and read",
      activity: {
        ...target.activity,
        statements: target.activity.statements.map((row, index) =>
          index === 0 ? { ...row, text: "Edited statement" } : row,
        ),
      },
    });
    const updated = next.sections
      .flatMap((section) => section.parts)
      .find((part) => part.id === target.id);
    expect(updated?.title).toBe("Edited look and read");
    expect(
      updated && updated.kind === "picture_yes_no"
        ? updated.activity.statements[0]?.text
        : null,
    ).toBe("Edited statement");
    expect(definition.sections[0]?.parts[0]?.title).not.toBe(
      "Edited look and read",
    );
  });
});
