import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/105_parent_guardian_foundation.sql"),
  "utf8",
);

describe("guardian security migration contract", () => {
  it("isolates invitation token hashes from authenticated table access", () => {
    expect(migration).toContain("create table if not exists public.guardian_invitation_tokens");
    expect(migration).toContain(
      "revoke all on public.guardian_invitation_tokens from public, anon, authenticated",
    );
    expect(migration).not.toMatch(
      /create policy[\s\S]{0,160}guardian_invitation_tokens[\s\S]{0,160}authenticated/i,
    );
  });

  it("requires a verified matching auth email during atomic acceptance", () => {
    expect(migration).toContain("select lower(email), email_confirmed_at");
    expect(migration).toContain("if v_confirmed_at is null then");
    expect(migration).toContain("if v_email <> v_invitation.invited_email then");
    expect(migration).toContain("for update of gi");
  });

  it("uses active relationships for guardian access and revocation", () => {
    expect(migration).toContain("create or replace function public.is_active_guardian");
    expect(migration).toContain("and sg.status = 'active'");
    expect(migration).toContain("create or replace function public.revoke_guardian_relationship");
    expect(migration).toContain("set status = 'revoked'");
  });

  it("does not add direct guardian policies to student profiles or mastery", () => {
    expect(migration).not.toMatch(/create policy[\s\S]{0,100}student_profiles/i);
    expect(migration).not.toMatch(/create policy[\s\S]{0,100}student_mastery_records/i);
    expect(migration).not.toMatch(/create policy[\s\S]{0,100}student_learning_evidence/i);
  });

  it("defaults relationship-derived parent data to minimal DTO functions", () => {
    expect(migration).toContain("create or replace function public.parent_linked_students()");
    expect(migration).not.toContain("username text");
  });
});
