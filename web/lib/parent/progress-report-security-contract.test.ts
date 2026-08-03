import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/107_parent_progress_reports.sql"),
  "utf8",
);

describe("parent progress report security migration contract", () => {
  it("stores immutable versioned presentation snapshots", () => {
    expect(migration).toContain("unique(student_id, version)");
    expect(migration).toContain("snapshot jsonb not null");
    expect(migration).toContain("snapshot ->> 'schemaVersion' = '1'");
  });

  it("allows parents to read only the latest published report through an active-link RPC", () => {
    expect(migration).toContain("create or replace function public.parent_published_progress_report");
    expect(migration).toContain("if not public.is_active_guardian(p_student_id) then");
    expect(migration).toContain("and ppr.status = 'published'");
    expect(migration).not.toMatch(
      /create policy[\s\S]{0,100}parent_progress_reports[\s\S]{0,180}is_active_guardian/i,
    );
  });

  it("prevents direct authenticated report writes", () => {
    expect(migration).toContain("grant select on public.parent_progress_reports to authenticated");
    expect(migration).not.toContain(
      "grant select, update on public.parent_progress_reports to authenticated",
    );
    expect(migration).toContain("create or replace function public.save_parent_progress_report");
  });

  it("binds teacher RLS checks to the report's actual class", () => {
    expect(migration).toContain("tc.id = parent_progress_reports.class_id");
    expect(migration).not.toContain("where tc.id = class_id");
  });

  it("publishes transactionally, replaces the previous publication, and audits the event", () => {
    expect(migration).toContain("create or replace function public.publish_parent_progress_report");
    expect(migration).toContain("where student_id = v_report.student_id");
    expect(migration).toContain("and status = 'published'");
    expect(migration).toContain("'parent_progress_report_published'");
  });

  it("does not query raw mastery or evidence from the parent RPC", () => {
    const parentRpc = migration.split(
      "create or replace function public.parent_published_progress_report",
    )[1]?.split("create or replace function public.parent_student_stream")[0];
    expect(parentRpc).toBeTruthy();
    expect(parentRpc).not.toContain("student_mastery_records");
    expect(parentRpc).not.toContain("student_learning_evidence");
  });
});
