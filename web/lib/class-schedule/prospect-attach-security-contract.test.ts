import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/116_attach_prospect_trial_student.sql"),
  "utf8",
);

describe("attach prospect trial student migration contract", () => {
  it("exposes teacher-only attach RPC that links guardian and sets student_id", () => {
    expect(migration).toContain(
      "create or replace function public.attach_student_to_pending_trial_booking",
    );
    expect(migration).toContain("insert into public.student_guardians");
    expect(migration).toContain("trial_prospect_guardian_linked");
    expect(migration).toContain("public.is_teacher()");
  });
});
