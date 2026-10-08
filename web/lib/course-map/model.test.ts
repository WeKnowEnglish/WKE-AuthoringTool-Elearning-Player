import { describe, expect, it } from "vitest";
import {
  activeLessons,
  blankCourse,
  blankPlannedLesson,
  courseDocumentSchema,
  coverageRows,
  duplicateUnit,
  planningIssues,
} from "./model";

function example() {
  const document = blankCourse("Primary English");
  const first = blankPlannedLesson("Introduce objects");
  const second = blankPlannedLesson("Review objects");
  const target = {
    id: crypto.randomUUID(),
    key: "pencil",
    label: "pencil",
    type: "word" as const,
  };
  document.targets = [target];
  first.targets = [{ targetId: target.id, role: "introduce" }];
  second.targets = [
    { targetId: target.id, role: "revisit" },
    { targetId: target.id, role: "assess" },
  ];
  second.prerequisites = [first.id];
  document.units = [
    {
      id: crypto.randomUUID(),
      title: "Objects",
      outcome: "Ask about objects",
      archived: false,
      lessons: [first, second],
    },
  ];
  return { document, first, second };
}
describe("curriculum planning contracts", () => {
  it("allows an incomplete skeleton and reports preparation needs", () => {
    const { document, first } = example();
    expect(courseDocumentSchema.parse(document)).toEqual(document);
    expect(planningIssues(document, first)).toContain("Add a success check");
  });
  it("detects a prerequisite moved after its dependent lesson", () => {
    const { document, first, second } = example();
    document.units[0].lessons = [second, first];
    expect(planningIssues(document, second)).toContain(
      "Prerequisite is archived or comes later",
    );
  });
  it("requires revisiting to follow introduction and assessment to be explicitly mapped", () => {
    const { document } = example();
    expect(coverageRows(document)[0].warnings).toEqual([]);
    document.units[0].lessons.reverse();
    expect(coverageRows(document)[0].warnings).toContain("No later revisit");
    document.units[0].lessons[0].archived = true;
    expect(coverageRows(document)[0].warnings).toContain(
      "No planned assessment",
    );
  });
  it("duplicates unit node identities and internal prerequisites while reusing targets", () => {
    const { document } = example();
    const copy = duplicateUnit(document.units[0]);
    expect(copy.id).not.toBe(document.units[0].id);
    expect(copy.lessons[1].prerequisites).toEqual([copy.lessons[0].id]);
    expect(copy.lessons[0].targets).toEqual(
      document.units[0].lessons[0].targets,
    );
  });
  it("rejects orphan references and duplicate stable identities", () => {
    const { document, first } = example();
    first.objectiveIds = [crypto.randomUUID()];
    expect(() => courseDocumentSchema.parse(document)).toThrow(
      /invalid objective/,
    );
    first.objectiveIds = [];
    document.units[0].lessons.push(first);
    expect(() => courseDocumentSchema.parse(document)).toThrow(/unique IDs/);
  });
  it("keeps archived lessons out of the active progression", () => {
    const { document, second } = example();
    second.archived = true;
    expect(activeLessons(document)).toHaveLength(1);
  });
});
