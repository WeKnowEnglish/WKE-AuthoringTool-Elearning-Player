import { describe, expect, it } from "vitest";
import {
  STUDENT_FACING_STATIC_COPY_AUDIT_SOURCES,
  STUDENT_FACING_STATIC_COPY,
  validateStudentFacingStaticCopy,
} from "@/lib/student-facing-static-copy";

describe("student-facing static copy", () => {
  it("keeps reviewed static hub, pet, quest, and player copy free of blocking ESL errors", () => {
    const issues = validateStudentFacingStaticCopy(STUDENT_FACING_STATIC_COPY);
    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("covers the first set of non-payload student surfaces", () => {
    const owners = Array.from(new Set(STUDENT_FACING_STATIC_COPY.map((entry) => entry.owner)));
    expect(owners).toEqual(
      expect.arrayContaining([
        "lesson-player",
        "student-hub",
        "daily-quests",
        "pet-care",
        "explore",
        "mini-game",
      ]),
    );
  });

  it("has registered copy for every audited static-copy source", () => {
    for (const audited of STUDENT_FACING_STATIC_COPY_AUDIT_SOURCES) {
      expect(
        STUDENT_FACING_STATIC_COPY.some((entry) =>
          audited.source === "components/lesson/interactions" ?
            entry.source.startsWith(audited.source)
          : entry.source === audited.source,
        ),
      ).toBe(true);
    }
  });

  it("flags hard-coded UI copy with grammar that should never reach students", () => {
    const issues = validateStudentFacingStaticCopy([
      {
        id: "test.bad_static_copy",
        text: "This is an eggs.",
        role: "feedback",
        owner: "mini-game",
        source: "test",
      },
    ]);

    expect(issues).toContainEqual(
      expect.objectContaining({
        id: "test.bad_static_copy",
        severity: "error",
        code: "broken_article_noun_agreement",
      }),
    );
  });
});
