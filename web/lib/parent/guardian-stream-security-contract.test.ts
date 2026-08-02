import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/106_parent_guardian_stream.sql"),
  "utf8",
);

describe("guardian stream security migration contract", () => {
  it("keeps existing and future class posts private by default", () => {
    expect(migration).toContain("guardian_visibility text not null default 'none'");
    expect(migration).toContain("cp.guardian_visibility = 'class_guardians'");
    expect(migration).toContain("cp.guardian_visibility = 'tagged_student_guardians'");
  });

  it("requires an active relationship before returning any stream row", () => {
    expect(migration).toContain("if not public.is_active_guardian(p_student_id) then");
    expect(migration).toContain("return;");
  });

  it("blocks guardian photo sharing while class photos use public media", () => {
    expect(migration).toContain("check (kind <> 'photo' or guardian_visibility = 'none')");
    expect(migration).toContain("if v_post.kind = 'photo' and p_visibility <> 'none' then");
    expect(migration).toContain("where cp.kind <> 'photo'");
  });

  it("does not expose student-only activity launch paths", () => {
    expect(migration).not.toContain("when cp.kind = 'activity' then cp.activity_play_path");
  });

  it("keeps publication table writes teacher-owned and enrollment-scoped", () => {
    expect(migration).toContain("parent_stream_publications_teacher_insert");
    expect(migration).toContain("tc.teacher_id = auth.uid()");
    expect(migration).toContain("tc.id = parent_stream_publications.class_id");
    expect(migration).toContain("ce.student_id = parent_stream_publications.student_id");
    expect(migration).not.toMatch(
      /create policy[\s\S]{0,100}parent_stream_publications[\s\S]{0,100}for select[\s\S]{0,160}is_active_guardian/i,
    );
  });

  it("exposes parent rows only through the minimal relationship-checked RPC", () => {
    expect(migration).toContain("create or replace function public.parent_student_stream");
    expect(migration).toContain(
      "revoke execute on function public.parent_student_stream(uuid, int)",
    );
    expect(migration).toContain("grant execute on function public.parent_student_stream(uuid, int)");
  });
});
