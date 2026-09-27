import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SCOPED_HOMEWORK_ACTIONS = [
  "../actions/homework-writing-submission.ts",
  "../actions/homework-collection-attempt.ts",
  "../actions/homework-template-submission.ts",
  "../actions/homework-template-speaking.ts",
  "../actions/homework-collection-speaking.ts",
  "../actions/homework-collection-media.ts",
] as const;

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("student homework authorization scope", () => {
  for (const relativePath of SCOPED_HOMEWORK_ACTIONS) {
    it(`${relativePath} uses the shared student-session resolver`, () => {
      const source = readSource(relativePath);

      expect(source).toContain("resolveStudentActionSession");
      expect(source).toContain("StudentActionAuthFailure");
      expect(source).toContain("studentHomeworkForbiddenFailure");
      expect(source).toContain("studentHomeworkUnavailableFailure");
      expect(source).toContain("studentHomeworkServiceUnavailableFailure");
      expect(source).not.toMatch(
        /if \((?:homeworkError|membershipError)\) return \{ ok: false, error: (?:homeworkError|membershipError)\.message \}/,
      );
      expect(source).not.toContain("supabase.auth.getUser(");
      expect(source).not.toContain("Student authentication required");
    });
  }

  it("catalog homework completion uses the shared resolver", () => {
    const source = readSource("../actions/class-homework.ts");

    expect(source).toContain("resolveStudentActionSession");
    expect(source).toContain("StudentActionAuthFailure");
    expect(source).not.toMatch(
      /if \((?:homeworkError|membershipError)\) return \{ ok: false, error: (?:homeworkError|membershipError)\.message \}/,
    );
  });
});
