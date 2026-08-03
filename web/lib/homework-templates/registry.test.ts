import { describe, expect, it } from "vitest";
import {
  getHomeworkTemplateDefinition,
  homeworkTemplatePartLabel,
  isHomeworkTemplatePartId,
} from "@/lib/homework-templates/registry";

describe("homework template registry", () => {
  it("registers the five-part secondary homework as assignable content", () => {
    const template = getHomeworkTemplateDefinition("secondary-homework-template-one");
    expect(template).toMatchObject({
      title: "Secondary Homework One",
      level: "secondary",
      sectionCount: 5,
      contentStatus: "ready",
    });
    expect(template?.parts.map((part) => part.id)).toEqual([
      "community-sequence",
      "past-corrections",
      "irregular-dialogue",
      "past-question-choice",
      "community-speaking",
    ]);
  });

  it("validates and labels part ids per template", () => {
    expect(isHomeworkTemplatePartId("secondary-homework-template-one", "past-question-choice")).toBe(true);
    expect(isHomeworkTemplatePartId("secondary-homework-template-one", "picture-cloze")).toBe(false);
    expect(homeworkTemplatePartLabel("homework-template-one", "verb-table")).toBe("Verb table");
  });
});
