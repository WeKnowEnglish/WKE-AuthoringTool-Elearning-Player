import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function migration(name: string): string {
  return readFileSync(resolve(process.cwd(), "supabase/migrations", name), "utf8");
}

function policy(source: string, name: string): string {
  const escaped = name.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
  const match = source.match(
    new RegExp(`create policy ["']?` + escaped + `["']?[\\s\\S]*?;`, "i"),
  );
  expect(match, `Missing policy ` + name).not.toBeNull();
  return match?.[0] ?? "";
}

describe("student homework RLS contract", () => {
  it("limits assigned-homework reads by role, enrollment, status, and target", () => {
    const source = migration("103_homework_student_targeting.sql");
    const block = policy(source, "class_homework_student_select");

    expect(block).toContain("public.is_student()");
    expect(block).toContain("public.class_enrollments");
    expect(block).toContain("status in ('assigned', 'closed')");
    expect(block).toContain("auth.uid() = any(target_student_ids)");
  });

  it("protects direct writing and template inserts and updates", () => {
    const writing = migration("123_homework_writing_submissions.sql");
    const template = migration("110_homework_template_reviews.sql");
    const policies = [
      policy(writing, "homework_writing_submissions_student_insert"),
      policy(writing, "homework_writing_submissions_student_update"),
      policy(template, "homework_template_submissions_student_insert"),
      policy(template, "homework_template_submissions_student_update"),
    ];

    for (const block of policies) {
      expect(block).toContain("public.is_student()");
      expect(block).toContain("student_id = auth.uid()");
      expect(block).toContain("public.class_enrollments");
      expect(block).toContain("h.status in ('assigned', 'closed')");
      expect(block).toContain("auth.uid() = any(h.target_student_ids)");
    }
  });

  it("hardens completion and speaking writes by role, enrollment, and target", () => {
    const source = migration("144_student_homework_write_rls_hardening.sql");
    const policies = [
      "class_homework_completions_student_insert",
      "class_homework_completions_student_update",
      "homework_template_speaking_student_insert",
      "homework_template_speaking_student_update",
      "homework_collection_speaking_student_insert",
      "homework_collection_speaking_student_update",
    ];

    for (const name of policies) {
      const block = policy(source, name);
      expect(block).toContain("public.is_student()");
      expect(block).toContain("student_id = auth.uid()");
      expect(block).toContain("public.class_enrollments");
      expect(block).toContain("auth.uid() = any(h.target_student_ids)");
    }
  });

  it("keeps service-role collection tables read-only to direct student clients", () => {
    for (const name of [
      "137_homework_collection_attempts.sql",
      "142_homework_collection_media.sql",
    ]) {
      const source = migration(name);
      expect(source).not.toMatch(/grant[^;]*\b(insert|update|delete)\b[^;]*to authenticated/i);
      expect(source).not.toMatch(/for (insert|update|delete)\s+to authenticated/i);
    }
  });

  it("guards the completion RPC before its security-definer write", () => {
    const source = migration("136_guard_legacy_homework_rewards.sql");

    expect(source).toContain("v_student_id is null or not public.is_student()");
    expect(source).toContain("public.class_enrollments");
    expect(source).toContain("v_student_id = any(v_homework.target_student_ids)");
    expect(source).toContain("grant execute on function public.complete_primary_homework");
  });

  it("requires the linked-database audit to verify the hardened predicates", () => {
    const audit = readFileSync(
      resolve(process.cwd(), "scripts/audit-supabase-migration-baseline.mjs"),
      "utf8",
    );

    expect(audit).toContain("144_student_homework_write_rls_hardening.sql");
    expect(audit).toContain("coalesce(with_check, '') ilike '%is_student%'");
    expect(audit).toContain("coalesce(with_check, '') ilike '%target_student_ids%'");
    expect(audit).toContain("coalesce(qual, '') ilike '%is_student%'");
  });
});
