import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("student homework authorization migration contract", () => {
  it("uses the shared resolver for writing save and submit", () => {
    const action = source("lib/actions/homework-writing-submission.ts");
    expect(action).toContain("resolveStudentActionSession(");
    expect(action).not.toContain('error: "Student authentication required."');
    expect(action).not.toContain("supabase.auth.getUser()");
  });

  it("uses the same shared resolver for catalog and writing completion", () => {
    const actions = source("lib/actions/class-homework.ts");
    const completionBody = actions.slice(
      actions.indexOf("async function recordCatalogHomeworkCompletion"),
      actions.indexOf("export async function recordPackQuizHomeworkCompletion"),
    );
    expect(completionBody).toContain("resolveStudentActionSession(");
    expect(completionBody).not.toContain('error: "Student authentication required."');
    expect(completionBody).not.toContain("supabase.auth.getUser()");
  });

  it("keeps writing recovery scoped to the authenticated student id", () => {
    const primaryPage = source("app/(student)/primary/homework/[homeworkId]/page.tsx");
    const secondaryPage = source("app/(student)/secondary/homework/[homeworkId]/page.tsx");
    const player = source("components/homework/HomeworkWritingPromptPlayer.tsx");
    expect(primaryPage).toContain("studentId={user.id}");
    expect(secondaryPage).toContain("studentId={user.id}");
    expect(player).toContain("writeHomeworkWritingDraft(studentId, homeworkId, nextText)");
  });
});
