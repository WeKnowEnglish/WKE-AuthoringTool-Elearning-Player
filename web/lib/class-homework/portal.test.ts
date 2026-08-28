import { describe, expect, it } from "vitest";
import { resolveHomeworkPortal } from "@/lib/class-homework/portal";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";

describe("resolveHomeworkPortal", () => {
  it("routes template and graded homework by their frozen level", () => {
    const secondaryTemplate: ClassHomeworkPayload = {
      type: "homework_template",
      templateId: "secondary-homework-template-one",
      title: "Secondary Homework One",
      sectionCount: 5,
      frozenAt: "2026-08-24T00:00:00.000Z",
    };
    expect(resolveHomeworkPortal(secondaryTemplate, "a1")).toBe("secondary");

    const graded: ClassHomeworkPayload = {
      type: "graded_track",
      title: "Edited learning track",
      sectionCount: 2,
      originTemplateId: "secondary-homework-template-one",
      level: "secondary",
      document: {},
      frozenAt: "2026-08-24T00:00:00.000Z",
    };
    expect(resolveHomeworkPortal(graded, "a1")).toBe("secondary");
  });

  it("keeps Primary-only activities in the Primary player", () => {
    const assessment: ClassHomeworkPayload = {
      type: "primary_a2_assessment",
      definitionId: "primary-a2-exit-pilot",
      contentVersion: "1",
      title: "Assessment",
      itemCount: 1,
      frozenAt: "2026-08-24T00:00:00.000Z",
    };
    expect(resolveHomeworkPortal(assessment, "a2")).toBe("primary");
  });

  it("routes shared homework by the student's learning band", () => {
    const writing: ClassHomeworkPayload = {
      type: "writing_prompt",
      prompt: "Write about your weekend.",
    };
    expect(resolveHomeworkPortal(writing, "a2")).toBe("secondary");
    expect(resolveHomeworkPortal(writing, "a1")).toBe("primary");
    expect(resolveHomeworkPortal(writing, null)).toBe("primary");
  });
});
