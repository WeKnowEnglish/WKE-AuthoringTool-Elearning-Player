import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/108_parent_notifications_and_pilot_support.sql"),
  "utf8",
);

describe("parent notification security migration contract", () => {
  it("allows parents to select only their own in-app-visible notifications", () => {
    expect(migration).toContain("guardian_user_id = auth.uid() and visible_in_app = true");
    expect(migration).toContain("grant select on public.parent_notifications to authenticated");
    expect(migration).not.toMatch(/grant (insert|update|delete).*parent_notifications.*authenticated/i);
  });

  it("keeps notification copy generic and links only to parent routes", () => {
    expect(migration).toContain("link_path like '/parent/%'");
    expect(migration).toContain("Sign in to see the teacher-reviewed learning update.");
    expect(migration).not.toContain("teacherSummary");
    expect(migration).not.toContain("student_mastery_records");
    expect(migration).not.toContain("student_learning_evidence");
  });

  it("deduplicates report and access-change delivery", () => {
    expect(migration).toContain("unique(guardian_user_id, notification_type, source_id)");
    expect(migration).toContain("on conflict (guardian_user_id, notification_type, source_id) do nothing");
  });

  it("requires teacher ownership for report notifications", () => {
    expect(migration).toContain("v_report.teacher_id <> auth.uid()");
    expect(migration).toContain("public.teacher_can_manage_guardians(v_report.student_id)");
  });

  it("adds a dedicated parent diagnostics surface without allowing sensitive payloads here", () => {
    expect(migration).toContain("'admin', 'parent'");
    expect(migration).not.toContain("report narrative");
  });
});
